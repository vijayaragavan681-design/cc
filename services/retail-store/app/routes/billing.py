import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from common.auth import get_current_user, require_role
from common.models import BillRecord, CheckoutRequest, RoleEnum, UserContext
from services.retail_store.app.services.billing_service import BillingService

logger = logging.getLogger("billing_routes")
router = APIRouter(prefix="/api/billing", tags=["Billing & Checkout"])


@router.post("/checkout", response_model=BillRecord)
def checkout(
    request: CheckoutRequest,
    user: UserContext = Depends(get_current_user),
):
    """
    Customer completes a purchase:
    - Validates authoritative prices.
    - Decreases stock atomically via conditional writes.
    - Allocates batches with First-Expiry-First-Out (FEFO).
    - Prevents expired products from being sold.
    - Returns structured bill confirmation.
    """
    if user.role == RoleEnum.STORE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store owners cannot checkout as customers. Please use a customer account.",
        )

    return BillingService.process_checkout(request, user)


@router.get("/my-bills", response_model=List[BillRecord])
def get_my_bills(
    user: UserContext = Depends(require_role(RoleEnum.CUSTOMER)),
):
    """
    Allows authenticated customers to view ONLY their own purchase history and bills.
    Uses DynamoDB CustomerIdIndex GSI for efficient query isolation.
    """
    return BillingService.get_customer_bills(user.user_id)
