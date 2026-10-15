from common.models import AlertItem, AlertTypeEnum, AlertSeverityEnum, NotificationStatusEnum
from services.inventory.app.services.alert_service import AlertService


def test_alert_generation_and_deduplication(inventory_client, store001_owner_headers, mock_dynamodb):
    """
    Verifies that low stock and expiry conditions generate deterministic alerts,
    and running the evaluation a second time deduplicates and does NOT spam repeated notifications.
    """
    # 1. Trigger prediction & alert generation run
    res1 = inventory_client.post("/api/inventory/STORE001/predictions/run", headers=store001_owner_headers)
    assert res1.status_code == 200

    # Retrieve generated alerts
    alerts_res = inventory_client.get("/api/inventory/STORE001/alerts", headers=store001_owner_headers)
    assert alerts_res.status_code == 200
    initial_alerts = alerts_res.data if hasattr(alerts_res, "data") else alerts_res.json()

    # The low stock product PROD_LOW must have generated a LOW_STOCK alert
    low_stock_alert = next((a for a in initial_alerts if a["alertType"] == "LOW_STOCK"), None)
    assert low_stock_alert is not None
    assert low_stock_alert["notificationStatus"] in ["SENT", "PENDING"]
    first_notified_at = low_stock_alert.get("lastNotifiedAt")

    initial_count = len(initial_alerts)

    # 2. Re-run predictions and alert check
    res2 = inventory_client.post("/api/inventory/STORE001/predictions/run", headers=store001_owner_headers)
    assert res2.status_code == 200

    alerts_res2 = inventory_client.get("/api/inventory/STORE001/alerts", headers=store001_owner_headers)
    second_alerts = alerts_res2.json()

    # Alert count must NOT have doubled! Total alerts should remain the same due to deterministic alertId
    assert len(second_alerts) == initial_count

    # The notification status should remain SENT and not re-dispatch
    same_alert = next((a for a in second_alerts if a["alertId"] == low_stock_alert["alertId"]), None)
    assert same_alert is not None
    assert same_alert["notificationStatus"] == "SENT"


def test_acknowledge_alert(inventory_client, store001_owner_headers, mock_dynamodb):
    # Ensure an alert exists
    inventory_client.post("/api/inventory/STORE001/predictions/run", headers=store001_owner_headers)
    alerts = inventory_client.get("/api/inventory/STORE001/alerts", headers=store001_owner_headers).json()
    assert len(alerts) > 0
    target_alert = alerts[0]
    alert_id = target_alert["alertId"]

    # Acknowledge
    ack_res = inventory_client.post(
        f"/api/inventory/STORE001/alerts/{alert_id}/acknowledge",
        headers=store001_owner_headers,
    )
    assert ack_res.status_code == 200
    updated = ack_res.json()
    assert updated["acknowledged"] is True
