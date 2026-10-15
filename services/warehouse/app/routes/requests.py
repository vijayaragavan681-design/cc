import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from common.auth import get_current_user, require_role, enforce_store_access
from common.models import (
    RoleEnum,
    UserContext,
    WarehouseRequestCreate,
    WarehouseRequestItem,
    WarehouseRequestStatusEnum,
)
from services.warehouse.app.services.warehouse_service import WarehouseService

logger = logging.getLogger("warehouse_routes")
router = APIRouter(prefix="/api/warehouse/requests", tags=["Warehouse Requests"])


@router.post("", response_model=WarehouseRequestItem)
def create_replenishment_request(
    request_data: WarehouseRequestCreate,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Submit a warehouse replenishment request for low or expiring stock.
    Enforces store owner authorization.
    """
    enforce_store_access(request_data.store_id, user)
    return WarehouseService.create_replenishment_request(request_data, user.user_id)


@router.get("", response_model=List[WarehouseRequestItem])
def list_replenishment_requests(
    store_id: str = Query("ALL", description="Store ID to query requests for, or 'ALL' for all stores"),
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER, RoleEnum.WAREHOUSE_OWNER)),
):
    """
    List replenishment requests for the authorized store or all stores.
    """
    if store_id.upper() != "ALL":
        enforce_store_access(store_id, user)
    return WarehouseService.get_requests_for_store(store_id)


@router.get("/{request_id}", response_model=WarehouseRequestItem)
def get_replenishment_request(
    request_id: str,
    store_id: str = Query(..., description="Store ID of the request"),
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER, RoleEnum.WAREHOUSE_OWNER)),
):
    """
    Retrieve details of a specific replenishment request.
    """
    enforce_store_access(store_id, user)
    item = WarehouseService.get_request_by_id(store_id, request_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Replenishment request {request_id} not found in store {store_id}.",
        )
    return item


@router.post("/{request_id}/status", response_model=WarehouseRequestItem)
def update_replenishment_request_status(
    request_id: str,
    status_update: str = Query(..., alias="status", description="New status: APPROVED or REJECTED"),
    store_id: str = Query(..., description="Store ID of the request"),
    user: UserContext = Depends(require_role(RoleEnum.WAREHOUSE_OWNER)),
):
    """
    Accept (APPROVE) or REJECT a replenishment request.
    Restricted EXCLUSIVELY to Warehouse Owners/Managers.
    """
    enforce_store_access(store_id, user)
    try:
        new_status = WarehouseRequestStatusEnum(status_update.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_update}'. Allowed: {[s.value for s in WarehouseRequestStatusEnum]}",
        )

    updated = WarehouseService.update_request_status(store_id, request_id, new_status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Replenishment request {request_id} not found in store {store_id}.",
        )
    return updated


@router.post("/{request_id}/acknowledge", response_model=WarehouseRequestItem)
def acknowledge_replenishment_request(
    request_id: str,
    store_id: str = Query(..., description="Store ID of the request"),
    user: UserContext = Depends(require_role(RoleEnum.WAREHOUSE_OWNER)),
):
    """
    Mark replenishment request as ACKNOWLEDGED.
    """
    enforce_store_access(store_id, user)
    updated = WarehouseService.acknowledge_request(store_id, request_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Replenishment request {request_id} not found in store {store_id}.",
        )
    return updated
