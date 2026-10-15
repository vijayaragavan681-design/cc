# Smart Retail Inventory and Demand Forecasting System

[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![AWS ECS Fargate](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900.svg)](https://aws.amazon.com/fargate/)
[![Amazon DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-4053D6.svg)](https://aws.amazon.com/dynamodb/)
[![Microsoft Entra ID](https://img.shields.io/badge/Azure-Entra%20ID-0078D4.svg)](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)
[![Tests Passing](https://img.shields.io/badge/tests-30%2F30%20passed-success.svg)]()

A complete, runnable, secure, Dockerized, multi-cloud retail inventory management and demand forecasting platform built from scratch.

---

## 1. Project Overview

The **Smart Retail Inventory and Demand Forecasting System** coordinates operations across three distinct retail stores:
- **`STORE001` — Downtown Flagship**
- **`STORE002` — Suburban Market**
- **`STORE003` — Uptown Express**

Each store maintains independent inventory counts, shelf-life batch histories, and sales logs. The system serves two primary roles:
- **`CUSTOMER`:** Browse live store catalogs, verify authoritative prices, purchase items with atomic First-Expiry-First-Out (FEFO) batch allocation, and review purchase history.
- **`STORE_OWNER`:** Access their assigned store's KPI dashboard, monitor 7-day machine learning demand forecasts, track inventory coverage, receive deduplicated stockout and expiry alerts, and request warehouse replenishments.

The architecture comprises **exactly three business microservices**:
1. **Retail Store Service (FastAPI, Port 8001)**
2. **Inventory and ML Prediction Service (FastAPI, Port 8002)**
3. **Warehouse Service (FastAPI, Port 8003)**

---

## 2. Technology Stack & Cloud Responsibilities

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS with custom retail design system
- **Routing:** React Router v6
- **Data Visualization:** Recharts (Demand forecasts vs. stock levels, category breakdowns)
- **Icons:** Lucide React
- **Identity:** Microsoft Authentication Library for React (`@azure/msal-react`, `@azure/msal-browser`)

### Backend & Machine Learning
- **Framework:** Python 3.12+, FastAPI, Uvicorn, Pydantic v2, pydantic-settings
- **ML Pipeline:** scikit-learn (`RandomForestRegressor`), pandas, NumPy, joblib
- **AWS SDK:** boto3 (DynamoDB, SNS, CloudWatch)
- **Testing:** pytest, HTTPX

### Multi-Cloud Architecture
- **Microsoft Entra ID (Azure):** Enterprise identity provider managing authentication, access token issuance, and `CUSTOMER` vs `STORE_OWNER` role authorization.
- **Amazon DynamoDB (AWS):** Persistent NoSQL database supporting on-demand billing, conditional writes, and Global Secondary Indexes.
- **AWS ECS with AWS Fargate (AWS):** Serverless container compute running the 3 independent microservices.
- **Amazon ECR (AWS):** Container image registries.
- **Amazon SNS (AWS):** Real-time email notifications for critical inventory and expiry alerts.
- **Amazon EventBridge Scheduler (AWS):** Scheduled daily invocation of the ECS prediction job.
- **Amazon CloudWatch (AWS):** Centralized structured logging and diagnostics.
- **AWS CloudFormation (AWS):** Infrastructure-as-Code templates for 100% reproducible provisioning.

---

## 3. Project Structure

```
.
├── Makefile                                # Top-level development workflows
├── docker-compose.yml                      # Full-stack local multi-container composition
├── requirements.txt                        # Pinned backend dependencies
├── .env.example                            # Documented configuration placeholders
├── common/                                 # Shared library across microservices
│   ├── auth.py                             # Microsoft Entra ID JWT validation & Dev Mock Auth
│   ├── config.py                           # Pydantic BaseSettings configuration
│   ├── dynamodb.py                         # Boto3 DynamoDB client & Decimal conversions
│   ├── models.py                           # Pydantic v2 request/response schemas & Enums
│   └── sns.py                              # Amazon SNS publisher with alert formatting
├── services/
│   ├── retail-store/                       # Retail Store Service (Port 8001)
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py                     # FastAPI entry point & CORS
│   │       ├── routes/ (stores, billing, alerts)
│   │       └── services/ (store_service, billing_service)
│   ├── inventory/                          # Inventory & ML Prediction Service (Port 8002)
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py                     # FastAPI entry point & model preloader
│   │       ├── jobs/ (run_predictions)     # EventBridge scheduled ECS task runner
│   │       ├── routes/ (inventory, predictions, alerts, ml_info)
│   │       └── services/ (predictor, classifier, alert_service)
│   └── warehouse/                          # Warehouse Service (Port 8003)
│       ├── Dockerfile
│       ├── requirements.txt
│       └── app/
│           ├── main.py                     # FastAPI entry point
│           ├── routes/ (requests)
│           └── services/ (warehouse_service)
├── ml/                                     # Machine Learning Pipeline & Artifacts
│   ├── generate_dataset.py                 # Generates synthetic sales with stockout censoring
│   ├── train_model.py                      # Leak-free feature building, chronological split, training
│   ├── evaluate_model.py                   # Evaluates MAE, RMSE, WAPE vs. 7x moving average
│   ├── predict_example.py                  # Demonstrates inference & inventory classification
│   ├── data/
│   │   └── synthetic_sales.csv             # 18,000 synthetic observations across 3 stores
│   └── artifacts/
│       ├── demand_model.joblib             # Trained RandomForest regression pipeline
│       └── model_metadata.json             # Model version, features, and evaluation metrics
├── frontend/                               # React Single Page Application (Port 3000)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── auth/ (AuthContext, authConfig) # Dual MSAL & Dev Mock Auth engine
│   │   ├── api/client.js                   # Axios clients with bearer token interceptor
│   │   ├── context/CartContext.jsx         # Customer shopping cart & store selection
│   │   ├── components/ (Navbar, Sidebar, MetricCard, StatusBadge, Modal, EmptyState, LoadingSpinner)
│   │   └── pages/
│   │       ├── customer/ (Home, ProductCatalog, ProductDetail, Cart, Confirmation, MyBills, PurchaseHistory)
│   │       └── store-owner/ (Dashboard, InventoryOverview, ProductDetails, DemandForecast, Classification, Alerts, Expiry, Replenishment, Account)
├── infrastructure/                         # AWS Infrastructure-as-Code
│   ├── deploy.sh                           # CloudFormation deployment script
│   └── cloudformation/
│       ├── 01-dynamodb.yaml                # DynamoDB tables & Global Secondary Indexes
│       ├── 02-sns-alerting.yaml            # Amazon SNS Topic & email subscription
│       ├── 03-iam-roles.yaml               # Least-privilege IAM task roles & scheduler role
│       ├── 04-ecs-cluster-ecr.yaml         # ECS Fargate Cluster & ECR repositories
│       ├── 05-ecs-services.yaml            # Fargate Task Definitions & Services
│       └── 06-eventbridge-scheduler.yaml   # Daily ECS RunTask prediction schedule
├── scripts/
│   ├── init_dynamodb_tables.py             # Creates DynamoDB tables (local or AWS)
│   ├── seed_sample_data.py                 # Seeds multi-store inventory with FEFO batches
│   └── verify_system.py                    # End-to-end self-verification script
├── tests/                                  # Automated Test Suite (30 passed)
│   ├── conftest.py                         # Test fixtures & in-memory DynamoDB mock
│   ├── test_retail_service.py              # Catalog & store endpoints
│   ├── test_billing_correctness.py         # Atomic stock deductions, FEFO, idempotency
│   ├── test_inventory_service.py           # Inventory queries & predictions
│   ├── test_ml_pipeline.py                 # Leakage prevention, WAPE, classification rules
│   ├── test_alert_deduplication.py         # Deterministic alert keys & deduplication
│   ├── test_warehouse_service.py           # Replenishment request lifecycle
│   └── test_auth_and_roles.py              # RBAC & store isolation security tests
└── docs/                                   # Detailed Documentation
    ├── architecture.md                     # Deep architectural breakdown & Mermaid diagram
    ├── aws-setup.md                        # AWS CloudFormation & CLI deployment guide
    ├── azure-entra-setup.md                # Microsoft Entra ID registration & app roles
    ├── local-development.md                # Local workstation guide & Docker Compose
    ├── ml-training.md                      # ML modeling, features, and evaluation
    ├── alerting.md                         # Scheduled workflow & alert deduplication
    ├── deployment.md                       # Production deployment procedure
    ├── testing.md                          # Test suite structure & verification
    └── troubleshooting.md                  # Diagnostics & resolutions
```

---

## 4. Quick Start (Run Locally in 5 Minutes)

### Option A: Complete Stack via Docker Compose
Ensure Docker Desktop is running, then run:
```bash
docker compose up --build
```
- Open **[http://localhost:3000](http://localhost:3000)** in your browser.
- All microservices, DynamoDB Local, and the frontend start automatically.

### Option B: Native Local Development
1. **Create and activate Python virtual environment:**
   ```bash
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Start DynamoDB Local:**
   ```bash
   docker run -d -p 8000:8000 --name smart-retail-dynamodb-local amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -inMemory -sharedDb
   ```

3. **Initialize Tables & Seed Data:**
   ```bash
   python scripts/init_dynamodb_tables.py
   python scripts/seed_sample_data.py
   ```

4. **Generate Data & Train ML Model:**
   ```bash
   python ml/generate_dataset.py
   python ml/train_model.py
   ```

5. **Start the Microservices:**
   ```bash
   # Terminal 1: Retail Store Service (Port 8001)
   python -m uvicorn services.retail_store.app.main:app --port 8001 --reload

   # Terminal 2: Inventory & ML Service (Port 8002)
   python -m uvicorn services.inventory.app.main:app --port 8002 --reload

   # Terminal 3: Warehouse Service (Port 8003)
   python -m uvicorn services.warehouse.app.main:app --port 8003 --reload
   ```

6. **Start the React Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 5. Running Automated Tests

Run the complete 30-test suite with verbose test reporting:
```bash
python -m pytest -v tests/
```

Run the end-to-end self-verification script:
```bash
python scripts/verify_system.py
```

---

## 6. How to Test Core Features

### 1. Test Customer Billing & FEFO Batch Allocation
1. Open [http://localhost:3000](http://localhost:3000) and select the **Customer** profile from the top-right menu.
2. Select store **`STORE001` — Downtown Flagship**.
3. Browse products (e.g., *Organic Gala Apples 1kg* or *Organic Whole Milk 1L*).
4. Add items to cart and navigate to **Cart** -> **Complete Purchase**.
5. Observe the printable receipt: it displays the authoritative price, tax calculation, and the exact FEFO batch allocation (e.g. 20 units deducted from batch `PROD001-B1` expiring nearest in time, and remainder from `PROD001-B2`).
6. Navigate to **My Bills** to confirm the sale was isolated to your customer account.

### 2. Test ML Demand Forecasting & Stock Classification
1. Switch to **Store Owner (STORE001)** via the top-right menu.
2. Navigate to **Demand Forecasting** or **Store Owner Hub**.
3. Inspect the 7-day predicted demand bar chart versus available inventory.
4. Click **Run ML Demand Engine** to trigger an on-demand forecast.
5. Review the **Classification Policy** page:
   - **`LOW`**: Stock is below 1.2x safety stock threshold.
   - **`EXCESS`**: Stock provides > 21 days of coverage.
   - **`NORMAL`**: Stock is balanced.

### 3. Test Alert Deduplication & Expiry Monitoring
1. In the Store Owner portal, navigate to **Expiry Monitoring** to inspect batches approaching the 7-day warning window or expired batches.
2. Go to **Inventory Alerts** to view active alerts.
3. Observe the Amazon SNS notification status (`SENT`). Re-running predictions preserves the unresolved alert without resending duplicate emails.
4. Click **Acknowledge** on an alert to record operational action.

### 4. Test Warehouse Replenishment Requests
1. Navigate to **Replenishment** -> click **New Replenishment Request**.
2. Select a low-stock product, input quantity (e.g. 100 units), and state the justification.
3. Submit the request.
4. Verify the request appears with status `PENDING` and a unique identifier (e.g. `REQ-20261015-XXXXX`). Click **Acknowledge** to verify status transitions.

### 5. Test Store Isolation Security
1. Log in as **Store Owner (STORE001)**.
2. Attempt to view inventory or alerts for `STORE002` (either by navigating or making an API request).
3. The server immediately blocks access with:
   `HTTP 403 Forbidden: Store isolation violation: You are assigned to STORE001 and cannot access STORE002.`

---

## 7. Cloud Deployment Summary

Refer to our dedicated documentation guides for step-by-step instructions:
- [Architecture Details](docs/architecture.md)
- [AWS Setup & CloudFormation](docs/aws-setup.md)
- [Microsoft Entra ID Configuration](docs/azure-entra-setup.md)
- [Machine Learning & Model Training](docs/ml-training.md)
- [Alerting & Deduplication Guide](docs/alerting.md)
- [Production Deployment](docs/deployment.md)
- [Automated Testing](docs/testing.md)
- [Troubleshooting](docs/troubleshooting.md)
