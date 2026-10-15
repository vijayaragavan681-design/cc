import os
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

os.environ["AUTH_MODE"] = "MOCK"
os.environ["DYNAMODB_ENDPOINT_URL"] = "http://localhost:8000"
os.environ["AWS_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "test_key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "test_secret"

from common.config import settings
from common.dynamodb import db_manager, convert_floats_to_decimals
from services.retail_store.app.main import app as retail_app
from services.inventory.app.main import app as inventory_app
from services.warehouse.app.main import app as warehouse_app


class InMemoryDynamoDBTable:
    """Mock DynamoDB table supporting get_item, put_item, update_item, and query with condition checks."""

    def __init__(self, table_name, hash_key, range_key=None):
        self.table_name = table_name
        self.hash_key = hash_key
        self.range_key = range_key
        self.items = {}

    def _make_key(self, key_dict):
        h = str(key_dict.get(self.hash_key, ""))
        r = str(key_dict.get(self.range_key, "")) if self.range_key else ""
        return f"{h}#{r}"

    def put_item(self, Item):
        key = self._make_key(Item)
        self.items[key] = dict(Item)
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def get_item(self, Key):
        key = self._make_key(Key)
        item = self.items.get(key)
        if item:
            return {"Item": dict(item)}
        return {}

    def query(self, KeyConditionExpression=None, FilterExpression=None, IndexName=None, **kwargs):
        results = []
        for k, v in self.items.items():
            results.append(dict(v))
        return {"Items": results}

    def update_item(self, Key, UpdateExpression=None, ConditionExpression=None, ExpressionAttributeValues=None, **kwargs):
        from botocore.exceptions import ClientError
        key = self._make_key(Key)
        item = self.items.get(key)
        if not item:
            if ConditionExpression:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException", "Message": "The conditional request failed"}},
                    "UpdateItem"
                )
            item = dict(Key)
            self.items[key] = item

        # Evaluate ConditionExpression if present
        if ConditionExpression:
            if "totalStock >= :qty" in ConditionExpression:
                curr_stock = int(item.get("totalStock", 0))
                req_qty = int(ExpressionAttributeValues[":qty"])
                if curr_stock < req_qty:
                    raise ClientError(
                        {"Error": {"Code": "ConditionalCheckFailedException", "Message": "The conditional request failed"}},
                        "UpdateItem"
                    )

        # Apply basic SET updates
        if UpdateExpression and ExpressionAttributeValues:
            if "SET totalStock = totalStock - :qty" in UpdateExpression:
                item["totalStock"] = int(item["totalStock"]) - int(ExpressionAttributeValues[":qty"])
                if ":batches" in ExpressionAttributeValues:
                    item["batches"] = ExpressionAttributeValues[":batches"]
            elif "SET totalStock = totalStock + :qty" in UpdateExpression:
                item["totalStock"] = int(item["totalStock"]) + int(ExpressionAttributeValues[":qty"])
            elif "SET acknowledged = :t" in UpdateExpression:
                item["acknowledged"] = ExpressionAttributeValues[":t"]
            elif "SET #s = :ack" in UpdateExpression or "SET #s = :status" in UpdateExpression:
                item["status"] = ExpressionAttributeValues.get(":ack") or ExpressionAttributeValues.get(":status")

        self.items[key] = item
        return {"Attributes": dict(item), "ResponseMetadata": {"HTTPStatusCode": 200}}


@pytest.fixture(autouse=True)
def mock_dynamodb():
    """Sets up clean in-memory tables in db_manager for each test."""
    inv_table = InMemoryDynamoDBTable("RetailInventory", "storeId", "productId")
    sales_table = InMemoryDynamoDBTable("Sales", "storeId", "saleTimestampAndSaleId")
    preds_table = InMemoryDynamoDBTable("InventoryPredictions", "storeId", "productId")
    alerts_table = InMemoryDynamoDBTable("InventoryAlerts", "storeId", "alertId")
    wh_table = InMemoryDynamoDBTable("WarehouseRequests", "storeId", "requestId")

    # Seed initial test product in STORE001
    now_iso = datetime.now(timezone.utc).isoformat()
    inv_table.put_item({
        "storeId": "STORE001",
        "productId": "PROD001",
        "productName": "Organic Gala Apples 1kg",
        "category": "Produce",
        "price": Decimal("3.99"),
        "totalStock": 50,
        "batches": [
            {"batchId": "PROD001-B1", "expiryDate": "2026-12-31", "quantity": 20},
            {"batchId": "PROD001-B2", "expiryDate": "2027-01-15", "quantity": 30},
        ],
        "lastUpdated": now_iso,
    })

    # Seed product in STORE002
    inv_table.put_item({
        "storeId": "STORE002",
        "productId": "PROD001",
        "productName": "Organic Gala Apples 1kg",
        "category": "Produce",
        "price": Decimal("3.99"),
        "totalStock": 35,
        "batches": [
            {"batchId": "PROD001-B1", "expiryDate": "2026-11-20", "quantity": 35},
        ],
        "lastUpdated": now_iso,
    })

    # Seed a low-stock product in STORE001 for testing alerts
    inv_table.put_item({
        "storeId": "STORE001",
        "productId": "PROD_LOW",
        "productName": "Low Stock Organic Milk",
        "category": "Dairy",
        "price": Decimal("2.99"),
        "totalStock": 3,
        "batches": [
            {"batchId": "LOW-B1", "expiryDate": "2027-01-01", "quantity": 3},
        ],
        "lastUpdated": now_iso,
    })

    # Register in db_manager
    db_manager.set_table("inventory", inv_table)
    db_manager.set_table("sales", sales_table)
    db_manager.set_table("predictions", preds_table)
    db_manager.set_table("alerts", alerts_table)
    db_manager.set_table("warehouse", wh_table)

    yield {
        "inventory": inv_table,
        "sales": sales_table,
        "predictions": preds_table,
        "alerts": alerts_table,
        "warehouse": wh_table,
    }

    db_manager.reset_custom_tables()


@pytest.fixture
def retail_client():
    return TestClient(retail_app)


@pytest.fixture
def inventory_client():
    return TestClient(inventory_app)


@pytest.fixture
def warehouse_client():
    return TestClient(warehouse_app)


@pytest.fixture
def customer_headers():
    return {"Authorization": "Bearer mock-customer-1"}


@pytest.fixture
def store001_owner_headers():
    return {"Authorization": "Bearer mock-owner-store001"}


@pytest.fixture
def store002_owner_headers():
    return {"Authorization": "Bearer mock-owner-store002"}


@pytest.fixture
def warehouse_manager_headers():
    return {"Authorization": "Bearer mock-warehouse-manager"}
