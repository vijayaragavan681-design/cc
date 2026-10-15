import logging
from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from common.auth import get_current_user, require_role, enforce_store_access
from common.config import settings
from common.models import (
    ProductInventoryItem,
    RoleEnum,
    StoreInfo,
    UserContext,
    WarehouseRequestCreate,
    WarehouseRequestItem,
)
from services.retail_store.app.services.store_service import StoreService

logger = logging.getLogger("stores_routes")
router = APIRouter(prefix="/api/stores", tags=["Stores & Products"])


@router.get("", response_model=List[StoreInfo])
def get_all_stores():
    """Retrieve list of all active retail stores."""
    return StoreService.list_all_stores()


@router.get("/{store_id}/products", response_model=List[ProductInventoryItem])
def get_store_products(
    store_id: str,
    user: UserContext = Depends(get_current_user),
):
    """
    Retrieve product inventory for a store.
    Store owners are restricted to their assigned store.
    Customers may browse products at any store.
    """
    enforce_store_access(store_id, user)
    return StoreService.get_store_products(store_id)


@router.get("/{store_id}/products/{product_id}", response_model=ProductInventoryItem)
def get_store_product_detail(
    store_id: str,
    product_id: str,
    user: UserContext = Depends(get_current_user),
):
    """Retrieve detail of a specific product with batch and expiry information."""
    enforce_store_access(store_id, user)
    product = StoreService.get_product(store_id, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found in store {store_id}.",
        )
    return product


@router.post("/{store_id}/warehouse-replenish", response_model=WarehouseRequestItem)
async def submit_warehouse_replenishment(
    store_id: str,
    request_data: WarehouseRequestCreate,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Store owner submits a replenishment request to the Warehouse Service via REST API.
    Enforces store ownership authorization.
    """
    enforce_store_access(store_id, user)
    if request_data.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Store mismatch: Payload storeId ({request_data.store_id}) does not match path ({store_id}).",
        )

    # Call Warehouse Service REST API
    warehouse_url = f"{settings.warehouse_service_url}/api/warehouse/requests"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Content-Type": "application/json"}
            # Pass mock or bearer token
            headers["Authorization"] = f"Bearer mock-owner-{store_id.lower()}" if settings.auth_mode == "MOCK" else ""

            response = await client.post(
                warehouse_url,
                json=request_data.model_dump(by_alias=True),
                headers=headers,
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Warehouse Service returned error: {response.text}",
                )
            return WarehouseRequestItem.model_validate(response.json())
    except httpx.RequestError as e:
        logger.error(f"Failed to communicate with Warehouse Service at {warehouse_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Warehouse Service unreachable: {str(e)}",
        )
