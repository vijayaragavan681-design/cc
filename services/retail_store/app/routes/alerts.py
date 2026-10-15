import logging
from typing import List
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends
from common.auth import require_role, enforce_store_access
from common.dynamodb import db_manager, convert_decimals_to_primitives
from common.models import AlertItem, RoleEnum, UserContext

logger = logging.getLogger("store_alerts_routes")
router = APIRouter(prefix="/api/stores", tags=["Store Alerts"])


@router.get("/{store_id}/alerts", response_model=List[AlertItem])
def get_store_alerts(
    store_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Retrieve inventory alerts generated for this store.
    Only authorized store owners assigned to this store can view alerts.
    """
    enforce_store_access(store_id, user)
    table = db_manager.alerts_table
    response = table.query(
        KeyConditionExpression=Key("storeId").eq(store_id),
        ScanIndexForward=False,
    )
    items = response.get("Items", [])
    results = []
    for item in items:
        converted = convert_decimals_to_primitives(item)
        results.append(AlertItem.model_validate(converted))
    return results
