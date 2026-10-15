# Troubleshooting Guide

Common issues, diagnostic commands, and resolutions for the Smart Retail System.

---

## 1. DynamoDB & Database Issues

### Issue: `ResourceNotFoundException: Cannot do operations on a non-existent table`
- **Cause:** Tables have not yet been created in the local or cloud DynamoDB instance.
- **Resolution:**
  ```bash
  python scripts/init_dynamodb_tables.py
  python scripts/seed_sample_data.py
  ```

### Issue: `ConditionalCheckFailedException` during checkout
- **Cause:** Another concurrent transaction decreased available stock, or requested quantity exceeds available stock.
- **Resolution:** This is by design. The checkout engine safely rejected an overselling attempt to protect inventory integrity. The client receives HTTP 409 Conflict with a prompt to retry.

### Issue: Local DynamoDB connection refused on `localhost:8000`
- **Resolution:** Confirm Docker container is running:
  ```bash
  docker ps | grep dynamodb
  # Restart if needed:
  docker run -d -p 8000:8000 --name smart-retail-dynamodb-local amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -inMemory -sharedDb
  ```

---

## 2. Authentication & Authorization Issues

### Issue: HTTP 401 Unauthorized
- **Cause:** Missing or malformed `Authorization: Bearer <token>` header.
- **Resolution:**
  - In local development mode (`AUTH_MODE=MOCK`), provide a supported dev token, such as `Bearer mock-customer-1` or `Bearer mock-owner-store001`.
  - In Entra ID mode (`AUTH_MODE=ENTRA_ID`), verify that `AZURE_TENANT_ID` and `AZURE_API_CLIENT_ID` in `.env` match your Azure App Registration exactly.

### Issue: HTTP 403 Forbidden — "Store isolation violation"
- **Cause:** A store owner assigned to `STORE001` attempted to access data for `STORE002` or `STORE003`.
- **Resolution:** Switch to the correct store profile in the frontend top navigation or log in with an account authorized for the target store.

---

## 3. Machine Learning & Forecasting Issues

### Issue: `Model artifact not found at ml/artifacts/demand_model.joblib`
- **Cause:** Model training script has not been executed yet.
- **Resolution:**
  ```bash
  python ml/generate_dataset.py
  python ml/train_model.py
  ```
  The Inventory Service includes an automatic fallback to 7-day moving averages if the artifact is missing, ensuring high availability.

---

## 4. Amazon SNS & Alerting Issues

### Issue: Not receiving alert emails from Amazon SNS
- **Cause:** Email subscription was not confirmed, or `SNS_TOPIC_ARN` is not configured.
- **Resolution:**
  1. Check your email inbox and spam folder for an email from **AWS Notifications** with subject `AWS Notification - Subscription Confirmation`.
  2. Click the **Confirm subscription** link.
  3. Verify that the ARN in `.env` matches the deployed topic:
     ```bash
     aws sns list-subscriptions-by-topic --topic-arn <YOUR_SNS_TOPIC_ARN>
     ```

### Issue: Repeated emails are not arriving on every scheduled run
- **Cause:** This is the intended **Alert Deduplication** behavior. The system intentionally suppresses duplicate emails for ongoing, unresolved alerts to prevent inbox spam. To test re-alerting, acknowledge or resolve the alert in the dashboard first.

---

## 5. Docker & ECS Container Issues

### Issue: Container health check fails on startup
- **Resolution:**
  Check local container logs:
  ```bash
  docker logs smart-retail-store-service
  docker logs smart-retail-inventory-service
  docker logs smart-retail-warehouse-service
  ```
  Or check AWS CloudWatch logs for ECS tasks:
  ```bash
  aws logs tail /ecs/smart-retail-store-prod --follow
  aws logs tail /ecs/smart-retail-inventory-prod --follow
  ```
