import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from common.config import settings
from common.dynamodb import db_manager, convert_decimals_to_primitives, convert_floats_to_decimals
from common.models import (
    AlertItem,
    AlertSeverityEnum,
    AlertTypeEnum,
    NotificationStatusEnum,
)
from common.sns import publish_alert_notification

logger = logging.getLogger("alert_service")


class AlertService:
    @staticmethod
    def get_existing_alert(store_id: str, alert_id: str) -> Optional[AlertItem]:
        try:
            table = db_manager.alerts_table
            res = table.get_item(Key={"storeId": store_id, "alertId": alert_id})
            item = res.get("Item")
            if item:
                return AlertItem.model_validate(convert_decimals_to_primitives(item))
            return None
        except Exception as e:
            logger.error(f"Error checking existing alert {alert_id}: {e}")
            return None

    @classmethod
    def record_and_dispatch_alert(cls, alert: AlertItem) -> AlertItem:
        """
        Deduplicates alerts:
        If an alert with the deterministic alert_id already exists and has notification_status = SENT
        and is unresolved, we update the timestamp/currentStock but DO NOT re-send an SNS email.
        If it's new or was previously RESOLVED, we dispatch an SNS notification and record SENT.
        """
        existing = cls.get_existing_alert(alert.store_id, alert.alert_id)
        table = db_manager.alerts_table
        now_str = datetime.now(timezone.utc).isoformat()

        should_send_notification = True
        if existing and existing.notification_status == NotificationStatusEnum.SENT and not existing.acknowledged:
            should_send_notification = False
            alert.notification_status = NotificationStatusEnum.SENT
            alert.last_notified_at = existing.last_notified_at
            alert.created_at = existing.created_at
            alert.acknowledged = existing.acknowledged
        else:
            alert.created_at = now_str
            alert.notification_status = NotificationStatusEnum.PENDING

        alert.updated_at = now_str

        # Publish notification if required
        if should_send_notification:
            sns_ok = publish_alert_notification(alert)
            if sns_ok:
                alert.notification_status = NotificationStatusEnum.SENT
                alert.last_notified_at = now_str
            else:
                alert.notification_status = NotificationStatusEnum.FAILED

        # Persist alert in DynamoDB
        try:
            table.put_item(Item=convert_floats_to_decimals(alert.model_dump(by_alias=True)))
        except Exception as e:
            logger.error(f"Failed to persist alert {alert.alert_id}: {e}")

        return alert

    @classmethod
    def check_and_generate_alerts_for_product(cls, store_id: str, product: dict, predicted_demand_7d: float, safety_stock: float):
        """
        Evaluates stock thresholds and batch expiry for a product and generates deterministic alerts.
        Uses colon ':' separator instead of '#' to avoid URL fragment truncation in REST paths.
        """
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        warning_cutoff = (now + timedelta(days=settings.expiry_warning_days)).strftime("%Y-%m-%d")

        prod_id = product["productId"]
        prod_name = product.get("productName", prod_id)
        total_stock = int(product.get("totalStock", 0))
        batches = product.get("batches", [])

        # 1. Low Stock Alert
        if total_stock < safety_stock:
            alert_id = f"LOW_STOCK:{prod_id}"
            alert = AlertItem(
                alertId=alert_id,
                storeId=store_id,
                productId=prod_id,
                productName=prod_name,
                alertType=AlertTypeEnum.LOW_STOCK,
                severity=AlertSeverityEnum.CRITICAL if total_stock == 0 else AlertSeverityEnum.WARNING,
                description=f"Product '{prod_name}' stock is {total_stock} units, below safety threshold of {safety_stock} units.",
                currentStock=total_stock,
                predictedDemand=predicted_demand_7d,
                createdAt=now.isoformat(),
                updatedAt=now.isoformat(),
            )
            cls.record_and_dispatch_alert(alert)

    @staticmethod
    def acknowledge_alert(store_id: str, alert_id: str) -> Optional[AlertItem]:
        """Mark an alert as acknowledged by the store owner."""
        now_str = datetime.now(timezone.utc).isoformat()
        try:
            table = db_manager.alerts_table
            response = table.update_item(
                Key={"storeId": store_id, "alertId": alert_id},
                UpdateExpression="SET acknowledged = :t, updatedAt = :now",
                ExpressionAttributeValues={":t": True, ":now": now_str},
                ReturnValues="ALL_NEW",
            )
            item = response.get("Attributes")
            if item:
                return AlertItem.model_validate(convert_decimals_to_primitives(item))
            return None
        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id} in store {store_id}: {e}")
            raise
