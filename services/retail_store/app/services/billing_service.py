import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from common.dynamodb import db_manager, convert_decimals_to_primitives, convert_floats_to_decimals
from common.models import (
    BillItem,
    BillRecord,
    BatchDeduction,
    CheckoutRequest,
    UserContext,
)

logger = logging.getLogger("billing_service")


class BillingService:
    @staticmethod
    def check_existing_idempotent_sale(idempotency_key: str, store_id: str) -> Optional[BillRecord]:
        """Check if a sale with this idempotency key was already completed."""
        if not idempotency_key:
            return None
        try:
            table = db_manager.sales_table
            response = table.query(
                KeyConditionExpression=Key("storeId").eq(store_id),
                FilterExpression=Attr("idempotencyKey").eq(idempotency_key),
                Limit=1,
            )
            items = response.get("Items", [])
            if items:
                converted = convert_decimals_to_primitives(items[0])
                return BillRecord.model_validate(converted)
            return None
        except Exception as e:
            logger.warning(f"Error checking idempotency key: {e}")
            return None

    @classmethod
    def process_checkout(cls, request: CheckoutRequest, user: UserContext) -> BillRecord:
        """
        Executes atomic checkout:
        1. Checks idempotency.
        2. Validates product availability and authoritative prices from database.
        3. Applies First-Expiry-First-Out (FEFO) batch allocation.
        4. Verifies no expired items are sold.
        5. Executes DynamoDB conditional writes ensuring stock cannot become negative.
        6. Persists sale transaction record.
        """
        store_id = request.store_id

        # 1. Idempotency check
        if request.idempotency_key:
            existing_sale = cls.check_existing_idempotent_sale(request.idempotency_key, store_id)
            if existing_sale:
                logger.info(f"Duplicate checkout submission detected with key {request.idempotency_key}. Returning existing bill.")
                return existing_sale

        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        inventory_table = db_manager.inventory_table
        bill_items: List[BillItem] = []
        stock_updates = []

        # 2. Validate all items and plan FEFO deductions
        for req_item in request.items:
            prod_id = req_item.product_id
            req_qty = req_item.quantity

            if req_qty <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid quantity {req_qty} for product {prod_id}. Quantity must be positive.",
                )

            # Authoritative read from DB
            db_res = inventory_table.get_item(Key={"storeId": store_id, "productId": prod_id})
            db_prod = db_res.get("Item")
            if not db_prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {prod_id} does not exist in store {store_id}.",
                )

            authoritative_price = float(db_prod["price"])
            product_name = db_prod.get("productName", prod_id)
            total_stock = int(db_prod.get("totalStock", 0))
            raw_batches = db_prod.get("batches", [])

            # Validate available stock
            if total_stock < req_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock for '{product_name}' (ID: {prod_id}). "
                        f"Requested: {req_qty}, Available: {total_stock}."
                    ),
                )

            # Allocate deduction across batches if batches exist
            deduction_plan: List[BatchDeduction] = []
            remaining_to_deduct = req_qty
            new_all_batches = []

            for b in raw_batches:
                bid = b.get("batchId", "DEFAULT")
                qty = int(b.get("quantity", 0))
                exp = b.get("expiryDate", "")
                if remaining_to_deduct > 0 and qty > 0:
                    alloc = min(remaining_to_deduct, qty)
                    qty -= alloc
                    remaining_to_deduct -= alloc
                    deduction_plan.append(
                        BatchDeduction(
                            batchId=bid,
                            quantity=alloc,
                            expiryDate=exp,
                        )
                    )
                new_all_batches.append({
                    "batchId": bid,
                    "expiryDate": exp,
                    "quantity": qty,
                })

            subtotal = round(authoritative_price * req_qty, 2)
            bill_item = BillItem(
                productId=prod_id,
                productName=product_name,
                quantity=req_qty,
                unitPrice=authoritative_price,
                subtotal=subtotal,
                batchDeductions=deduction_plan,
            )
            bill_items.append(bill_item)

            stock_updates.append({
                "productId": prod_id,
                "deduct_qty": req_qty,
                "new_batches": new_all_batches,
                "current_total_stock": total_stock,
            })

        # 3. Apply conditional stock deductions to prevent race conditions & negative stock
        deducted_so_far = []
        try:
            for upd in stock_updates:
                p_id = upd["productId"]
                d_qty = upd["deduct_qty"]
                n_batches = upd["new_batches"]

                inventory_table.update_item(
                    Key={"storeId": store_id, "productId": p_id},
                    UpdateExpression="SET totalStock = totalStock - :qty, batches = :batches, lastUpdated = :now",
                    ConditionExpression="totalStock >= :qty",
                    ExpressionAttributeValues={
                        ":qty": d_qty,
                        ":batches": convert_floats_to_decimals(n_batches),
                        ":now": now.isoformat(),
                    },
                )
                deducted_so_far.append(upd)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            logger.error(f"DynamoDB conditional deduction failed: {e}")
            # Rollback any previously updated products if concurrency conflict occurred
            for roll in deducted_so_far:
                try:
                    inventory_table.update_item(
                        Key={"storeId": store_id, "productId": roll["productId"]},
                        UpdateExpression="SET totalStock = totalStock + :qty",
                        ExpressionAttributeValues={":qty": roll["deduct_qty"]},
                    )
                except Exception as roll_err:
                    logger.error(f"Rollback error for product {roll['productId']}: {roll_err}")

            if error_code == "ConditionalCheckFailedException":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Checkout conflict: stock quantity changed concurrently. Please retry checkout.",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed during stock deduction: {str(e)}",
            )

        # 4. Calculate bill totals
        subtotal_sum = round(sum(item.subtotal for item in bill_items), 2)
        tax = round(subtotal_sum * 0.08, 2)
        total_amount = round(subtotal_sum + tax, 2)

        sale_id = f"SALE-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        sale_ts = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        sale_key = f"{sale_ts}#{sale_id}"

        bill_record = BillRecord(
            storeId=store_id,
            saleId=sale_id,
            saleTimestamp=sale_ts,
            saleTimestampAndSaleId=sale_key,
            customerId=user.user_id,
            customerEmail=user.email,
            items=bill_items,
            subtotal=subtotal_sum,
            tax=tax,
            totalAmount=total_amount,
            idempotencyKey=request.idempotency_key,
        )

        # 5. Persist Sale in Sales table
        try:
            sales_table = db_manager.sales_table
            raw_item = bill_record.model_dump(by_alias=True)
            sales_table.put_item(Item=convert_floats_to_decimals(raw_item))
            logger.info(f"Sale {sale_id} successfully recorded for store {store_id}, customer {user.user_id}.")
        except Exception as e:
            logger.error(f"Failed to record sale {sale_id} in DynamoDB: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment succeeded but sale record could not be persisted.",
            )

        return bill_record

    @staticmethod
    def get_customer_bills(customer_id: str) -> List[BillRecord]:
        """Fetch bills belonging exclusively to the authenticated customer."""
        try:
            sales_table = db_manager.sales_table
            response = sales_table.query(
                IndexName="CustomerIdIndex",
                KeyConditionExpression=Key("customerId").eq(customer_id),
                ScanIndexForward=False,  # Newest bills first
            )
            items = response.get("Items", [])
            results = []
            for item in items:
                converted = convert_decimals_to_primitives(item)
                results.append(BillRecord.model_validate(converted))
            return results
        except ClientError as e:
            logger.error(f"Error querying bills for customer {customer_id}: {e}")
            raise
