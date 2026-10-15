# Automated Alerting & Notification Architecture

This document describes the alerting architecture, deduplication mechanisms, Amazon SNS integration, and scheduled execution workflow.

---

## 1. Alerting Workflow Overview

```
Amazon EventBridge Scheduler
     │ (Daily at 06:00 UTC)
     ▼
ECS Fargate Task (Inventory Service image)
     │ Command override: python -m services.inventory.app.jobs.run_predictions
     │
     ├─► Reads current inventory & batch shelf-life from DynamoDB
     ├─► Executes 7-day demand forecasting model
     ├─► Audits safety stock thresholds and batch expiry dates
     │
     ▼
Persistent DynamoDB Record (InventoryAlerts table)
     │
     ├─► Deduplication Check:
     │     Has this unresolved alert already been dispatched?
     │     YES: Update timestamps; DO NOT resend email.
     │     NO: Dispatch alert to Amazon SNS.
     │
     ▼
Amazon SNS Topic (smart-retail-inventory-alerts)
     │
     ▼
Store Operations Team Email Inbox
```

---

## 2. Alert Types & Severity Classifications

| Alert Type | Trigger Condition | Severity | Description |
|---|---|---|---|
| `LOW_STOCK` | $\text{Stock} = 0$ | `CRITICAL` | Stockout event. Customer orders will be rejected. Immediate replenishment required. |
| `LOW_STOCK` | $0 < \text{Stock} < \text{Safety Stock}$ | `WARNING` | Stock dropped below projected 7-day demand buffer ($1.2\times$). |
| `EXPIRED` | $\text{Batch Expiry Date} < \text{Today}$ | `CRITICAL` | Batch has expired. Prohibited from being sold by the FEFO engine. Must be audited and disposed. |
| `EXPIRING_SOON` | $\text{Batch Expiry} \le \text{Today} + 7 \text{ days}$ | `WARNING` | Batch expires within the 7-day warning window. Priority markdown or promotional sale advised. |

---

## 3. Alert Deduplication Strategy

In an automated system running hourly or daily, repeating notifications for the same ongoing condition leads to alert fatigue. The Smart Retail System prevents this using **deterministic alert identifiers** and **notification state tracking**:

### 1. Deterministic Alert Keys
Alert IDs are deterministic:
- Low Stock: `LOW_STOCK:{productId}` (e.g. `LOW_STOCK:PROD001`)
- Expiring Batch: `EXPIRING_SOON:{productId}:{batchId}` (e.g. `EXPIRING_SOON:PROD002:PROD002-B1`)
- Expired Batch: `EXPIRED:{productId}:{batchId}` (e.g. `EXPIRED:PROD006:PROD006-B1`)

### 2. State Machine & SNS Delivery Logic
Before publishing to Amazon SNS, `AlertService.record_and_dispatch_alert()` queries the `InventoryAlerts` table for the matching `(storeId, alertId)`:

```python
if existing and existing.notification_status == "SENT" and not existing.acknowledged:
    # Condition is ongoing and unresolved:
    # Update current stock and timestamp in DynamoDB, but SKIP re-publishing to SNS
    should_send_notification = False
else:
    # New alert condition, or condition was previously resolved/acknowledged:
    # Publish to Amazon SNS and mark notification_status = "SENT"
    should_send_notification = True
```

### 3. Impact
- **Run 1:** Low stock detected -> Alert stored in DynamoDB -> SNS email sent -> `notification_status = SENT`.
- **Run 2:** Condition still unresolved -> Alert timestamp refreshed -> **NO repeated email sent**.
- **Run 3 (Stock replenished):** Condition clears.
- **Run 4 (Stock drops again later):** Condition re-triggers -> Fresh SNS email sent.

---

## 4. Amazon SNS Email Configuration

### Setting up the SNS Subscription:
1. When provisioning `02-sns-alerting.yaml`, supply the `AlertEmailRecipient` parameter.
2. Amazon SNS sends an opt-in message with subject:
   `AWS Notification - Subscription Confirmation`
3. Click **Confirm subscription**.
4. Alerts are formatted with structured key-value pairs (Store ID, Product Name, Current Stock, 7-Day Forecast, Expiry Date, Action Plan).

---

## 5. Store Owner Dashboard Alert Management

The dashboard retrieves live alerts directly from the Inventory Service API (`GET /api/inventory/{store_id}/alerts`):
- Store owners can view severity badges, batch references, and stock levels.
- Clicking **Acknowledge** marks `acknowledged = true` in DynamoDB via `POST /api/inventory/{store_id}/alerts/{alert_id}/acknowledge`.
