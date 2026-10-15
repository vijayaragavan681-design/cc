import logging
from typing import List, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from common.dynamodb import db_manager, convert_decimals_to_primitives
from common.models import ProductInventoryItem, StoreInfo

logger = logging.getLogger("store_service")

# Authoritative store locations
STORE_REGISTRY = [
    StoreInfo(storeId="STORE001", storeName="Downtown Flagship", location="100 Metro Plaza, City Center", managerName="Sarah Jenkins"),
    StoreInfo(storeId="STORE002", storeName="Suburban Market", location="450 Valley Boulevard, Westside", managerName="David Rodriguez"),
    StoreInfo(storeId="STORE003", storeName="Uptown Express", location="88 Grand Avenue, North Hill", managerName="Emily Chen"),
]


class StoreService:
    @staticmethod
    def list_all_stores() -> List[StoreInfo]:
        return STORE_REGISTRY

    @staticmethod
    def get_store_by_id(store_id: str) -> Optional[StoreInfo]:
        for s in STORE_REGISTRY:
            if s.store_id == store_id:
                return s
        return None

    @staticmethod
    def get_store_products(store_id: str) -> List[ProductInventoryItem]:
        """Fetch all products and their batches for a specific store."""
        try:
            table = db_manager.inventory_table
            response = table.query(
                KeyConditionExpression=Key("storeId").eq(store_id)
            )
            items = response.get("Items", [])
            results = []
            for item in items:
                converted = convert_decimals_to_primitives(item)
                results.append(ProductInventoryItem.model_validate(converted))
            return results
        except ClientError as e:
            logger.error(f"Error fetching products for store {store_id}: {e}")
            raise

    @staticmethod
    def get_product(store_id: str, product_id: str) -> Optional[ProductInventoryItem]:
        """Fetch a specific product record for a store."""
        try:
            table = db_manager.inventory_table
            response = table.get_item(
                Key={"storeId": store_id, "productId": product_id}
            )
            item = response.get("Item")
            if not item:
                return None
            converted = convert_decimals_to_primitives(item)
            return ProductInventoryItem.model_validate(converted)
        except ClientError as e:
            logger.error(f"Error fetching product {product_id} in store {store_id}: {e}")
            raise
