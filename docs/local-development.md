# Local Development Guide

This guide walks through configuring, running, and developing the Smart Retail System locally.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:

- **Python 3.12+** (tested with Python 3.12 and Python 3.14)
- **Node.js 18+** & **npm 9+**
- **Docker Desktop** (for DynamoDB Local and full stack containerization)
- **Git**

---

## 2. Quick Start: Single Command via Docker Compose

To start the complete application stack (DynamoDB Local, Retail Store Service, Inventory & ML Service, Warehouse Service, and React Frontend) with one command:

```bash
docker compose up --build
```

Access the interfaces:
- **React Frontend:** [http://localhost:3000](http://localhost:3000)
- **Retail Store Service API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Inventory Service API Docs:** [http://localhost:8002/docs](http://localhost:8002/docs)
- **Warehouse Service API Docs:** [http://localhost:8003/docs](http://localhost:8003/docs)
- **DynamoDB Local:** `http://localhost:8000`

---

## 3. Native Local Development (Step-by-Step)

If you prefer to run services natively with hot-reloading:

### Step 1: Create and Activate Virtual Environment
```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 2: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Start DynamoDB Local
Start DynamoDB Local in the background:
```bash
docker run -d -p 8000:8000 --name smart-retail-dynamodb-local amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -inMemory -sharedDb
```

### Step 4: Initialize DynamoDB Tables and Seed Data
```bash
# Create all 5 application tables and GSIs
python scripts/init_dynamodb_tables.py

# Seed initial multi-store inventory (30 products across STORE001, STORE002, STORE003)
python scripts/seed_sample_data.py
```

### Step 5: Generate Synthetic Dataset & Train ML Model
```bash
# Generate 18,000 sales records with stockout censoring
python ml/generate_dataset.py

# Train 7-day RandomForest demand forecasting model and save artifact
python ml/train_model.py

# Verify evaluation metrics (MAE, RMSE, WAPE) against moving-average baseline
python ml/evaluate_model.py
```

### Step 6: Start Microservices
Open three separate terminal windows or run in background:

```bash
# Terminal 1: Retail Store Service (Port 8001)
python -m uvicorn services.retail_store.app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2: Inventory & ML Prediction Service (Port 8002)
python -m uvicorn services.inventory.app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 3: Warehouse Service (Port 8003)
python -m uvicorn services.warehouse.app.main:app --host 0.0.0.0 --port 8003 --reload
```

### Step 7: Start React Frontend
In a fourth terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Testing User Roles in Local Development

The system includes preconfigured mock profiles selectable in the UI:
1. **Customer Profile:** Browse product catalog across all three stores, add items to cart, test FEFO checkout, and view purchase history under `My Bills`.
2. **Store Owner STORE001 (Downtown Flagship):** View KPI dashboard, stock coverage, 7-day demand predictions, active alerts, and submit replenishment requests.
3. **Store Owner STORE002 / STORE003:** Experience strict store isolation; verifying that store owners cannot view or manipulate another store's inventory.
