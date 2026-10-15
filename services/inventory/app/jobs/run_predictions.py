import logging
import sys
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from common.config import settings
from common.dynamodb import db_manager, convert_decimals_to_primitives
from services.inventory.app.services.alert_service import AlertService
from services.inventory.app.services.predictor import DemandPredictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [ScheduledPredictionJob] %(message)s")
logger = logging.getLogger("run_predictions_job")


def run_all_store_predictions():
    """
    Scheduled job entry point (invoked by EventBridge Scheduler ECS RunTask).
    1. Loads trained ML model pipeline.
    2. Iterates over STORE001, STORE002, STORE003.
    3. Reads current inventory and stock batches from DynamoDB.
    4. Computes 7-day demand forecasts and inventory classifications.
    5. Checks stock thresholds and safety buffers.
    6. Stores predictions and alerts in DynamoDB with deduplication.
    7. Dispatches SNS notifications for new/unacknowledged critical alerts.
    """
    logger.info("Starting scheduled retail demand prediction and inventory analysis run...")
    start_time = datetime.now(timezone.utc)

    predictor = DemandPredictor.get_instance()
    inventory_table = db_manager.inventory_table

    total_stores_processed = 0
    total_products_processed = 0

    for store_id in settings.valid_store_ids:
        logger.info(f"Processing store: {store_id}...")
        try:
            response = inventory_table.query(KeyConditionExpression=Key("storeId").eq(store_id))
            products = response.get("Items", [])

            for raw_prod in products:
                prod = convert_decimals_to_primitives(raw_prod)
                # 1. Generate demand prediction and classification
                pred_item = predictor.predict_for_product(store_id, prod)

                # 2. Check and generate low stock and expiry alerts with deduplication
                AlertService.check_and_generate_alerts_for_product(
                    store_id=store_id,
                    product=prod,
                    predicted_demand_7d=pred_item.predicted_demand_7d,
                    safety_stock=pred_item.safety_stock,
                )
                total_products_processed += 1

            total_stores_processed += 1
            logger.info(f"Store {store_id} complete. ({len(products)} products analyzed).")
        except Exception as e:
            logger.error(f"Error processing predictions for store {store_id}: {e}", exc_info=True)

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(
        f"Scheduled prediction run completed in {duration:.2f}s. "
        f"Stores: {total_stores_processed}, Products: {total_products_processed}."
    )


if __name__ == "__main__":
    run_all_store_predictions()
