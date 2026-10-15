# Automated Testing & Verification Guide

This document describes the test suite, test cases, and verification procedures for the Smart Retail System.

---

## 1. Running the Automated Test Suite

To run all automated tests:

```bash
# Activate virtual environment
source .venv/bin/activate  # On Windows: .\.venv\Scripts\Activate.ps1

# Run pytest with verbose output
python -m pytest -v tests/
```

To run a specific test category:
```bash
# Test atomic billing correctness and FEFO allocation
python -m pytest -v tests/test_billing_correctness.py

# Test ML pipeline, feature leakage prevention, and metrics
python -m pytest -v tests/test_ml_pipeline.py

# Test role authorization and cross-store isolation
python -m pytest -v tests/test_auth_and_roles.py

# Test alert deduplication and SNS handling
python -m pytest -v tests/test_alert_deduplication.py
```

---

## 2. Test Suite Structure & Coverage

The test suite contains 30 automated test cases across 7 modules:

| Test Module | Coverage & Test Cases |
|---|---|
| `test_retail_service.py` | Health endpoint, store listing (`STORE001`, `STORE002`, `STORE003`), product inventory query, product detail, 404 handling |
| `test_billing_correctness.py` | Successful customer checkout, FEFO batch allocation, database stock deduction, duplicate checkout idempotency, insufficient stock rejection, expired product sale blocking, customer-only bill querying, store owner checkout prohibition |
| `test_inventory_service.py` | Health endpoint, inventory inspection by store owner, ML model info API, on-demand prediction execution, individual product prediction |
| `test_ml_pipeline.py` | Model artifact persistence and reloading, feature lag verification, zero target leakage assertion, WAPE metric validation, classification policy mathematical boundaries (`LOW`, `NORMAL`, `EXCESS`) |
| `test_alert_deduplication.py` | Low-stock and expired batch alert creation, alert deduplication ensuring unresolved alerts do not re-dispatch SNS notifications, alert acknowledgment |
| `test_warehouse_service.py` | Health endpoint, replenishment request creation with status `PENDING`, negative quantity validation rejection (HTTP 422), store-level request listing, status transition to `ACKNOWLEDGED` |
| `test_auth_and_roles.py` | Missing token rejection (HTTP 401), customer denied store owner routes (HTTP 403), store owner cross-store isolation (`STORE001` owner denied `STORE002` access) |

---

## 3. End-to-End System Self-Verification

A standalone verification script is provided to test ML model loading, predictions, classifications, service imports, and CloudFormation templates in one quick command:

```bash
python scripts/verify_system.py
```

---

## 4. Integration Testing with Real AWS Resources

Once AWS resources are deployed:
1. Set `DYNAMODB_ENDPOINT_URL=""` (empty) in `.env` to target real AWS DynamoDB.
2. Set `SNS_TOPIC_ARN` to your provisioned topic ARN.
3. Run `python scripts/init_dynamodb_tables.py` to confirm table reachability.
4. Run `python scripts/seed_sample_data.py` to populate multi-store inventory.
5. Trigger an on-demand prediction or checkout via the frontend and verify DynamoDB items and CloudWatch logs.
