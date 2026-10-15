import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional
import joblib
import pandas as pd
from boto3.dynamodb.conditions import Key
from common.config import settings
from common.dynamodb import db_manager, convert_decimals_to_primitives, convert_floats_to_decimals
from common.models import ModelMetadata, PredictionItem
from services.inventory.app.services.classifier import InventoryClassifier

logger = logging.getLogger("predictor_service")


class DemandPredictor:
    _instance = None
    _pipeline = None
    _metadata = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load_model()
        return cls._instance

    def load_model(self):
        """Loads trained ML pipeline and metadata."""
        model_path = settings.model_path
        meta_path = settings.model_metadata_path

        if os.path.exists(model_path):
            try:
                self._pipeline = joblib.load(model_path)
                logger.info(f"Loaded trained demand model from {model_path}")
            except Exception as e:
                logger.error(f"Error loading model from {model_path}: {e}")
                self._pipeline = None
        else:
            logger.warning(f"Model artifact not found at {model_path}. Predictions will use moving average fallback.")
            self._pipeline = None

        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata from {meta_path}: {e}")
                self._metadata = None

    def get_model_info(self) -> ModelMetadata:
        if self._metadata:
            return ModelMetadata.model_validate(self._metadata)
        return ModelMetadata(
            model_version=settings.model_version,
            training_date="N/A",
            dataset_version="N/A",
            feature_names=[],
            evaluation_metrics={"mae": 0.0, "rmse": 0.0, "wape": 0.0},
            training_config={"status": "Default / Fallback"},
        )

    def predict_for_product(self, store_id: str, product: dict) -> PredictionItem:
        """
        Generates 7-day demand forecast and classification for a specific store product.
        """
        now = datetime.now(timezone.utc)
        prod_id = product["productId"]
        prod_name = product.get("productName", prod_id)
        category = product.get("category", "General")
        current_stock = int(product.get("totalStock", 0))
        price = float(product.get("price", 5.0))

        # Build feature vector
        day_of_week = now.weekday()
        month = now.month
        is_weekend = 1 if day_of_week in [4, 5, 6] else 0

        # Construct typical sales context for inference
        # If pipeline is loaded, predict with regression model
        predicted_7d = 0.0
        if self._pipeline:
            try:
                feature_row = {
                    "store_id": store_id,
                    "product_id": prod_id,
                    "category": category,
                    "price": price,
                    "available_stock": current_stock,
                    "day_of_week": day_of_week,
                    "month": month,
                    "is_weekend": is_weekend,
                    "is_promotion": 0,
                    # Lags and moving statistics (approximated from baseline if cold-start)
                    "lag_0": max(5.0, current_stock * 0.1),
                    "lag_1": max(5.0, current_stock * 0.1),
                    "lag_2": max(5.0, current_stock * 0.1),
                    "lag_3": max(5.0, current_stock * 0.1),
                    "lag_7": max(5.0, current_stock * 0.1),
                    "lag_14": max(5.0, current_stock * 0.1),
                    "rolling_mean_7d": max(5.0, current_stock * 0.1),
                    "rolling_std_7d": 1.5,
                    "rolling_mean_14d": max(5.0, current_stock * 0.1),
                    "rolling_mean_28d": max(5.0, current_stock * 0.1),
                    "recent_stockouts_7d": 0,
                }
                df_input = pd.DataFrame([feature_row])
                raw_pred = self._pipeline.predict(df_input)[0]
                predicted_7d = round(max(0.0, float(raw_pred)), 1)
            except Exception as e:
                logger.error(f"Inference error for {prod_id}: {e}. Falling back to baseline.")
                predicted_7d = round(max(5.0, current_stock * 0.4), 1)
        else:
            predicted_7d = round(max(5.0, current_stock * 0.4), 1)

        # Run inventory classification
        classification_result = InventoryClassifier.classify(
            current_stock=current_stock,
            predicted_demand_7d=predicted_7d,
            safety_factor=settings.safety_stock_factor,
            excess_coverage_days=settings.excess_stock_coverage_days,
        )

        item = PredictionItem(
            storeId=store_id,
            productId=prod_id,
            productName=prod_name,
            category=category,
            currentStock=current_stock,
            predictedDemand7d=predicted_7d,
            safetyStock=classification_result["safety_stock"],
            coverageDays=classification_result["coverage_days"],
            classification=classification_result["classification"],
            explanation=classification_result["explanation"],
            modelVersion=self._metadata.get("model_version", settings.model_version) if self._metadata else settings.model_version,
            updatedAt=now.isoformat(),
        )

        # Save latest prediction in DynamoDB InventoryPredictions table
        try:
            pred_table = db_manager.predictions_table
            pred_dict = item.model_dump(by_alias=True)
            pred_table.put_item(Item=convert_floats_to_decimals(pred_dict))
        except Exception as e:
            logger.warning(f"Could not persist prediction for {prod_id}: {e}")

        return item

    def get_latest_predictions(self, store_id: str) -> List[PredictionItem]:
        """Fetch cached latest predictions from DynamoDB."""
        try:
            table = db_manager.predictions_table
            response = table.query(KeyConditionExpression=Key("storeId").eq(store_id))
            items = response.get("Items", [])
            results = []
            for item in items:
                converted = convert_decimals_to_primitives(item)
                results.append(PredictionItem.model_validate(converted))
            return results
        except Exception as e:
            logger.error(f"Error fetching predictions for store {store_id}: {e}")
            return []
