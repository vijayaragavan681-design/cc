import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pandas as pd
from common.config import settings
from common.dynamodb import db_manager, convert_floats_to_decimals
from ml.generate_dataset import PRODUCTS, STORES
from ml.predict_example import classify_inventory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_sample_data")


def seed_sample_inventory_and_data():
    logger.info("Seeding initial inventory, sales, and predictions for STORE001, STORE002, STORE003...")
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    inventory_table = db_manager.inventory_table
    sales_table = db_manager.sales_table
    alerts_table = db_manager.alerts_table
    warehouse_table = db_manager.warehouse_table

    total_products_seeded = 0

    for store in STORES:
        store_id = store["store_id"]
        mult = store["multiplier"]

        for idx, prod in enumerate(PRODUCTS):
            prod_id = prod["id"]
            name = prod["name"]
            category = prod["category"]
            price = prod["base_price"]
            shelf_life = prod["shelf_life"]

            # Independent stock quantities per store
            # Vary stock across stores: STORE001 higher, STORE002 medium, STORE003 lower
            # Make a few products intentionally LOW stock (e.g., PROD006, PROD016)
            # Make a few products intentionally EXPIRING SOON (e.g., PROD002, PROD011)
            # Make a few products intentionally EXCESS (e.g., PROD026)
            if prod_id in ["PROD006", "PROD016"]:
                # Low stock items
                batch1_qty = 4
                batch2_qty = 6
                batch1_expiry = (now + timedelta(days=12)).strftime("%Y-%m-%d")
                batch2_expiry = (now + timedelta(days=18)).strftime("%Y-%m-%d")
            elif prod_id in ["PROD002", "PROD011"]:
                # Expiring soon batch (within 4 days)
                batch1_qty = 15
                batch2_qty = 25
                batch1_expiry = (now + timedelta(days=3)).strftime("%Y-%m-%d")
                batch2_expiry = (now + timedelta(days=9)).strftime("%Y-%m-%d")
            elif prod_id == "PROD026":
                # Excess stock
                batch1_qty = 150
                batch2_qty = 200
                batch1_expiry = (now + timedelta(days=180)).strftime("%Y-%m-%d")
                batch2_expiry = (now + timedelta(days=240)).strftime("%Y-%m-%d")
            else:
                base_q = int(prod["base_demand"] * mult * 3.5)
                batch1_qty = int(base_q * 0.4)
                batch2_qty = int(base_q * 0.6)
                batch1_expiry = (now + timedelta(days=shelf_life // 2 + 5)).strftime("%Y-%m-%d")
                batch2_expiry = (now + timedelta(days=shelf_life + 10)).strftime("%Y-%m-%d")

            total_stock = batch1_qty + batch2_qty

            batches = [
                {"batchId": f"{prod_id}-B1", "expiryDate": batch1_expiry, "quantity": batch1_qty},
                {"batchId": f"{prod_id}-B2", "expiryDate": batch2_expiry, "quantity": batch2_qty},
            ]

            item = {
                "storeId": store_id,
                "productId": prod_id,
                "productName": name,
                "category": category,
                "price": Decimal(str(price)),
                "totalStock": total_stock,
                "batches": batches,
                "lastUpdated": now.isoformat(),
            }

            inventory_table.put_item(Item=item)
            total_products_seeded += 1

    logger.info(f"Successfully seeded {total_products_seeded} inventory records across 3 stores.")

    # Seed a sample customer bill / sale record
    sample_sale_id = "SALE-20261015-001"
    sale_timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    sample_sale = {
        "storeId": "STORE001",
        "saleId": sample_sale_id,
        "saleTimestamp": sale_timestamp,
        "saleTimestampAndSaleId": f"{sale_timestamp}#{sample_sale_id}",
        "customerId": "cust-001",
        "customerEmail": "customer001@example.com",
        "items": [
            {
                "productId": "PROD001",
                "productName": "Organic Gala Apples 1kg",
                "quantity": 2,
                "unitPrice": Decimal("3.99"),
                "subtotal": Decimal("7.98"),
                "batchDeductions": [{"batchId": "PROD001-B1", "quantity": 2, "expiryDate": (now + timedelta(days=10)).strftime("%Y-%m-%d")}],
            },
            {
                "productId": "PROD007",
                "productName": "Greek Yogurt Plain 500g",
                "quantity": 1,
                "unitPrice": Decimal("4.29"),
                "subtotal": Decimal("4.29"),
                "batchDeductions": [{"batchId": "PROD007-B1", "quantity": 1, "expiryDate": (now + timedelta(days=12)).strftime("%Y-%m-%d")}],
            },
        ],
        "subtotal": Decimal("12.27"),
        "tax": Decimal("0.98"),
        "totalAmount": Decimal("13.25"),
        "idempotencyKey": "seed-checkout-001",
    }
    sales_table.put_item(Item=sample_sale)
    logger.info("Sample customer sale record seeded.")

    # Seed an initial warehouse replenishment request
    sample_warehouse_req = {
        "storeId": "STORE001",
        "requestId": "REQ-20261015-001",
        "productId": "PROD006",
        "productName": "Organic Whole Milk 1L",
        "requestedQuantity": 150,
        "reason": "Stock dropped below safety threshold due to high weekend demand.",
        "status": "PENDING",
        "createdBy": "owner-store001",
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
    }
    warehouse_table.put_item(Item=sample_warehouse_req)
    logger.info("Initial warehouse request seeded.")


if __name__ == "__main__":
    seed_sample_inventory_and_data()
