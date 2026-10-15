import logging
from typing import List
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, status
from common.auth import require_role, enforce_store_access
from common.dynamodb import db_manager, convert_decimals_to_primitives
from common.models import AlertItem, RoleEnum, UserContext
from services.inventory.app.services.alert_service import AlertService

logger = logging.getLogger("inventory_alerts_routes")
router = APIRouter(prefix="/api/inventory", tags=["Inventory Alerts"])


@router.get("/{store_id}/alerts", response_model=List[AlertItem])
def get_store_alerts(
    store_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Retrieve inventory alerts (low stock, expiring soon, expired) for a store.
    Enforces store ownership authorization.
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


@router.post("/{store_id}/alerts/{alert_id}/acknowledge", response_model=AlertItem)
def acknowledge_alert(
    store_id: str,
    alert_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Store owner acknowledges an alert.
    Enforces store ownership authorization.
    """
    enforce_store_access(store_id, user)
    updated = AlertService.acknowledge_alert(store_id, alert_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found in store {store_id}.",
        )
    return updated
