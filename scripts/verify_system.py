"""
System Verification Script for Smart Retail Inventory & Demand Forecasting System.
Performs end-to-end self-tests on ML model loading, predictions, classification, and service entrypoints.
"""
import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def verify_system():
    print("=" * 60)
    print("SMART RETAIL SYSTEM - SELF-VERIFICATION SUITE")
    print("=" * 60)

    # 1. Verify ML Artifacts
    print("\n[1/5] Checking ML artifacts...")
    model_path = os.path.join(PROJECT_ROOT, "ml/artifacts/demand_model.joblib")
    meta_path = os.path.join(PROJECT_ROOT, "ml/artifacts/model_metadata.json")
    dataset_path = os.path.join(PROJECT_ROOT, "ml/data/synthetic_sales.csv")

    for p in [model_path, meta_path, dataset_path]:
        if os.path.exists(p):
            size_kb = os.path.getsize(p) / 1024
            rel_p = os.path.relpath(p, PROJECT_ROOT)
            print(f"  [OK] Found {rel_p} ({size_kb:.1f} KB)")
        else:
            print(f"  [FAIL] Missing {p}!")
            sys.exit(1)

    # 2. Test Model Loading & Inference
    print("\n[2/5] Testing ML model loading & inference...")
    import joblib
    import pandas as pd
    pipeline = joblib.load(model_path)
    sample_input = pd.DataFrame([{
        "store_id": "STORE001",
        "product_id": "PROD001",
        "category": "Produce",
        "price": 3.99,
        "available_stock": 50,
        "day_of_week": 2,
        "month": 10,
        "is_weekend": 0,
        "is_promotion": 0,
        "lag_0": 15.0,
        "lag_1": 14.0,
        "lag_2": 16.0,
        "lag_3": 13.0,
        "lag_7": 15.0,
        "lag_14": 14.0,
        "rolling_mean_7d": 14.5,
        "rolling_std_7d": 1.2,
        "rolling_mean_14d": 14.3,
        "rolling_mean_28d": 14.0,
        "recent_stockouts_7d": 0,
    }])
    pred_7d = pipeline.predict(sample_input)[0]
    print(f"  [OK] Pipeline predicted 7-day demand: {pred_7d:.2f} units")

    # 3. Test Inventory Classification
    print("\n[3/5] Testing inventory classification logic...")
    from ml.predict_example import classify_inventory
    cls_result = classify_inventory(current_stock=20, predicted_demand_7d=pred_7d, safety_factor=1.2)
    print(f"  [OK] Classification for 20 units: [{cls_result['classification']}] - {cls_result['explanation']}")

    # 4. Test Service Imports & Routers
    print("\n[4/5] Testing microservice initialization...")
    from services.retail_store.app.main import app as retail_app
    from services.inventory.app.main import app as inventory_app
    from services.warehouse.app.main import app as warehouse_app
    print(f"  [OK] Retail Store Service: {retail_app.title}")
    print(f"  [OK] Inventory & ML Service: {inventory_app.title}")
    print(f"  [OK] Warehouse Service: {warehouse_app.title}")

    # 5. Check CloudFormation Templates
    print("\n[5/5] Checking CloudFormation templates...")
    cfn_files = [
        "infrastructure/cloudformation/01-dynamodb.yaml",
        "infrastructure/cloudformation/02-sns-alerting.yaml",
        "infrastructure/cloudformation/03-iam-roles.yaml",
        "infrastructure/cloudformation/04-ecs-cluster-ecr.yaml",
        "infrastructure/cloudformation/05-ecs-services.yaml",
        "infrastructure/cloudformation/06-eventbridge-scheduler.yaml",
    ]
    for c in cfn_files:
        full_p = os.path.join(PROJECT_ROOT, c)
        assert os.path.exists(full_p), f"Missing template: {c}"
        print(f"  [OK] {c}")

    print("\n" + "=" * 60)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify_system()
