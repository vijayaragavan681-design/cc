import logging
from typing import List
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends
from common.auth import require_role, enforce_store_access
from common.dynamodb import db_manager, convert_decimals_to_primitives
from common.models import ProductInventoryItem, RoleEnum, UserContext

logger = logging.getLogger("inventory_routes")
router = APIRouter(prefix="/api/inventory", tags=["Store Inventory"])


@router.get("/{store_id}", response_model=List[ProductInventoryItem])
def get_store_inventory(
    store_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Retrieve full inventory status for a specific store.
    Enforces store owner authorization.
    """
    enforce_store_access(store_id, user)
    table = db_manager.inventory_table
    response = table.query(KeyConditionExpression=Key("storeId").eq(store_id))
    items = response.get("Items", [])
    results = []
    for item in items:
        converted = convert_decimals_to_primitives(item)
        results.append(ProductInventoryItem.model_validate(converted))
    return results
