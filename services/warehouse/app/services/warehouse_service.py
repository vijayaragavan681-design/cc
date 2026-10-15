import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from common.dynamodb import db_manager, convert_decimals_to_primitives, convert_floats_to_decimals
from common.models import (
    WarehouseRequestCreate,
    WarehouseRequestItem,
    WarehouseRequestStatusEnum,
)

logger = logging.getLogger("warehouse_service")


STORE_INFO = {
    "STORE001": {"storeName": "Downtown Flagship", "managerName": "Sarah Jenkins"},
    "STORE002": {"storeName": "Suburban Market", "managerName": "David Rodriguez"},
    "STORE003": {"storeName": "Uptown Express", "managerName": "Emily Chen"},
}


class WarehouseService:
    @staticmethod
    def create_replenishment_request(request_data: WarehouseRequestCreate, user_id: str) -> WarehouseRequestItem:
        """
        Creates a new replenishment request:
        - Generates unique ID.
        - Sets initial status to PENDING.
        - Persists to DynamoDB WarehouseRequests table.
        """
        now = datetime.now(timezone.utc)
        req_id = f"REQ-{now.strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:5].upper()}"

        # Fetch product name if available from inventory table
        product_name = None
        try:
            inv_res = db_manager.inventory_table.get_item(
                Key={"storeId": request_data.store_id, "productId": request_data.product_id}
            )
            item = inv_res.get("Item")
            if item:
                product_name = item.get("productName")
        except Exception:
            pass

        store_meta = STORE_INFO.get(request_data.store_id, {})

        record = WarehouseRequestItem(
            requestId=req_id,
            storeId=request_data.store_id,
            storeName=store_meta.get("storeName", request_data.store_id),
            managerName=store_meta.get("managerName", user_id),
            productId=request_data.product_id,
            productName=product_name or request_data.product_id,
            requestedQuantity=request_data.requested_quantity,
            reason=request_data.reason,
            status=WarehouseRequestStatusEnum.PENDING,
            createdBy=user_id,
            createdAt=now.isoformat(),
            updatedAt=now.isoformat(),
        )

        try:
            table = db_manager.warehouse_table
            raw = record.model_dump(by_alias=True)
            table.put_item(Item=convert_floats_to_decimals(raw))
            logger.info(f"Created replenishment request {req_id} for store {request_data.store_id}.")
            return record
        except Exception as e:
            logger.error(f"Failed to persist warehouse request {req_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to record warehouse request: {str(e)}",
            )

    @staticmethod
    def get_requests_for_store(store_id: str) -> List[WarehouseRequestItem]:
        """Fetch replenishment requests for a specific store or all stores."""
        try:
            table = db_manager.warehouse_table
            if str(store_id).upper() in ("ALL", "*"):
                response = table.scan()
                items = response.get("Items", [])
            else:
                response = table.query(
                    KeyConditionExpression=Key("storeId").eq(store_id),
                    ScanIndexForward=False,
                )
                items = response.get("Items", [])

            results = []
            for item in items:
                converted = convert_decimals_to_primitives(item)
                # Fill storeName / managerName fallback if legacy record
                s_id = converted.get("storeId")
                if s_id in STORE_INFO:
                    if not converted.get("storeName"):
                        converted["storeName"] = STORE_INFO[s_id]["storeName"]
                    if not converted.get("managerName"):
                        converted["managerName"] = STORE_INFO[s_id]["managerName"]
                results.append(WarehouseRequestItem.model_validate(converted))

            # Sort latest first
            results.sort(key=lambda x: x.created_at, reverse=True)
            return results
        except ClientError as e:
            logger.error(f"Error querying warehouse requests for {store_id}: {e}")
            raise

    @staticmethod
    def get_request_by_id(store_id: str, request_id: str) -> Optional[WarehouseRequestItem]:
        """Retrieve a specific replenishment request."""
        try:
            table = db_manager.warehouse_table
            response = table.get_item(Key={"storeId": store_id, "requestId": request_id})
            item = response.get("Item")
            if not item:
                return None
            converted = convert_decimals_to_primitives(item)
            return WarehouseRequestItem.model_validate(converted)
        except ClientError as e:
            logger.error(f"Error retrieving warehouse request {request_id}: {e}")
            raise

    @staticmethod
    def update_request_status(store_id: str, request_id: str, new_status: WarehouseRequestStatusEnum) -> Optional[WarehouseRequestItem]:
        """Transition request status (e.g. APPROVED, REJECTED, ACKNOWLEDGED)."""
        now_str = datetime.now(timezone.utc).isoformat()
        status_val = new_status.value if isinstance(new_status, WarehouseRequestStatusEnum) else str(new_status)
        try:
            table = db_manager.warehouse_table
            response = table.update_item(
                Key={"storeId": store_id, "requestId": request_id},
                UpdateExpression="SET #s = :status, updatedAt = :now",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":status": status_val,
                    ":now": now_str,
                },
                ReturnValues="ALL_NEW",
            )
            item = response.get("Attributes")
            if not item:
                return None
            converted = convert_decimals_to_primitives(item)
            return WarehouseRequestItem.model_validate(converted)
        except Exception as e:
            logger.error(f"Error updating warehouse request {request_id} to {status_val}: {e}")
            raise

    @staticmethod
    def acknowledge_request(store_id: str, request_id: str) -> Optional[WarehouseRequestItem]:
        """Transition request status from PENDING to ACKNOWLEDGED."""
        return WarehouseService.update_request_status(store_id, request_id, WarehouseRequestStatusEnum.ACKNOWLEDGED)
