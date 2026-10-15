import logging
from typing import Optional, Dict, Any
import boto3
from common.config import settings
from common.models import AlertItem, NotificationStatusEnum

logger = logging.getLogger("sns_alerting")


def get_sns_client():
    kwargs: Dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("sns", **kwargs)


def publish_alert_notification(alert: AlertItem) -> bool:
    """
    Publishes an inventory alert event to Amazon SNS.
    Returns True if successfully published or mock acknowledged, False otherwise.
    """
    topic_arn = settings.sns_topic_arn
    if not topic_arn or topic_arn.startswith("arn:aws:sns:us-east-1:123456789012"):
        logger.info(
            f"[MOCK SNS ALERT] Alert {alert.alert_id} for store {alert.store_id} - "
            f"Type: {alert.alert_type.value}, Product: {alert.product_id}, Stock: {alert.current_stock}. "
            f"(Simulated delivery since real SNS_TOPIC_ARN not configured)"
        )
        return True

    subject = f"[{alert.severity.value}] Retail Alert: {alert.alert_type.value} at {alert.store_id}"
    # SNS subjects have a 100 character limit
    subject = subject[:98]

    body = (
        f"Smart Retail Inventory Alert Notification\n"
        f"=========================================\n"
        f"Store ID:        {alert.store_id}\n"
        f"Product:         {alert.product_name or alert.product_id} (ID: {alert.product_id})\n"
        f"Alert Type:      {alert.alert_type.value}\n"
        f"Severity:        {alert.severity.value}\n"
        f"Current Stock:   {alert.current_stock} units\n"
        f"Predicted Demand:{alert.predicted_demand if alert.predicted_demand is not None else 'N/A'}\n"
        f"Expiry Date:     {alert.expiry_date if alert.expiry_date else 'N/A'}\n"
        f"Description:     {alert.description}\n"
        f"Timestamp:       {alert.created_at}\n\n"
        f"Please log in to your Store Owner Dashboard to acknowledge this alert or initiate a replenishment request.\n"
    )

    try:
        client = get_sns_client()
        response = client.publish(
            TopicArn=topic_arn,
            Subject=subject,
            Message=body,
            MessageAttributes={
                "StoreId": {
                    "DataType": "String",
                    "StringValue": alert.store_id,
                },
                "AlertType": {
                    "DataType": "String",
                    "StringValue": alert.alert_type.value,
                },
                "Severity": {
                    "DataType": "String",
                    "StringValue": alert.severity.value,
                },
            },
        )
        message_id = response.get("MessageId")
        logger.info(f"SNS notification delivered successfully. MessageId: {message_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to publish SNS alert for {alert.alert_id}: {e}")
        return False
