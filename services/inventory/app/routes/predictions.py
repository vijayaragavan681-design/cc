import logging
from typing import List
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, status
from common.auth import require_role, enforce_store_access
from common.dynamodb import db_manager, convert_decimals_to_primitives
from common.models import PredictionItem, RoleEnum, UserContext
from services.inventory.app.services.alert_service import AlertService
from services.inventory.app.services.predictor import DemandPredictor

logger = logging.getLogger("prediction_routes")
router = APIRouter(prefix="/api/inventory", tags=["Predictions & Forecasting"])


@router.get("/{store_id}/predictions", response_model=List[PredictionItem])
def get_store_predictions(
    store_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Retrieve demand predictions and inventory classifications for all products in a store.
    Enforces store ownership authorization.
    """
    enforce_store_access(store_id, user)
    predictor = DemandPredictor.get_instance()
    preds = predictor.get_latest_predictions(store_id)

    # If no cached predictions exist yet, generate them on-the-fly
    if not preds:
        preds = run_predictions_for_store(store_id, user)
    return preds


@router.get("/{store_id}/predictions/{product_id}", response_model=PredictionItem)
def get_product_prediction(
    store_id: str,
    product_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Retrieve demand prediction and stock classification for a specific product.
    """
    enforce_store_access(store_id, user)
    table = db_manager.predictions_table
    res = table.get_item(Key={"storeId": store_id, "productId": product_id})
    item = res.get("Item")
    if not item:
        # Generate on-demand if product exists
        inv_res = db_manager.inventory_table.get_item(Key={"storeId": store_id, "productId": product_id})
        prod_item = inv_res.get("Item")
        if not prod_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found in store {store_id}.",
            )
        predictor = DemandPredictor.get_instance()
        return predictor.predict_for_product(store_id, convert_decimals_to_primitives(prod_item))

    converted = convert_decimals_to_primitives(item)
    return PredictionItem.model_validate(converted)


@router.post("/{store_id}/predictions/run", response_model=List[PredictionItem])
def run_predictions_for_store(
    store_id: str,
    user: UserContext = Depends(require_role(RoleEnum.STORE_OWNER)),
):
    """
    Triggers an immediate on-demand demand prediction and alert evaluation run for the store.
    """
    enforce_store_access(store_id, user)
    predictor = DemandPredictor.get_instance()
    inventory_table = db_manager.inventory_table

    response = inventory_table.query(KeyConditionExpression=Key("storeId").eq(store_id))
    products = response.get("Items", [])

    results = []
    for raw_prod in products:
        prod = convert_decimals_to_primitives(raw_prod)
        pred_item = predictor.predict_for_product(store_id, prod)
        AlertService.check_and_generate_alerts_for_product(
            store_id=store_id,
            product=prod,
            predicted_demand_7d=pred_item.predicted_demand_7d,
            safety_stock=pred_item.safety_stock,
        )
        results.append(pred_item)

    logger.info(f"On-demand predictions generated for {len(results)} products in store {store_id}.")
    return results
