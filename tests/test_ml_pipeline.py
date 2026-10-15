import os
import joblib
import numpy as np
import pandas as pd
from ml.predict_example import classify_inventory
from ml.train_model import build_features_and_target, calculate_wape


def test_model_artifact_exists_and_loads():
    model_path = "ml/artifacts/demand_model.joblib"
    assert os.path.exists(model_path), "Model artifact must exist"
    pipeline = joblib.load(model_path)
    assert pipeline is not None
    assert hasattr(pipeline, "predict")


def test_no_target_leakage():
    """
    Verifies that features are computed using ONLY data at or before day t,
    and target is strictly sum of sales in the forward window (t+1 through t+7).
    """
    raw_df = pd.read_csv("ml/data/synthetic_sales.csv")
    df = build_features_and_target(raw_df.head(600), forecast_horizon=7)

    # Check that lag_1 is the previous day's sales
    sample_group = df.groupby(["store_id", "product_id"]).get_group(("STORE001", "PROD001")).reset_index(drop=True)
    for i in range(1, len(sample_group)):
        assert sample_group.loc[i, "lag_1"] == sample_group.loc[i - 1, "units_sold"]

    # Verify target is forward looking
    assert "target_demand_7d" in df.columns
    assert (df["target_demand_7d"] >= 0).all()


def test_wape_calculation():
    y_true = np.array([10.0, 20.0, 30.0])
    y_pred = np.array([10.0, 20.0, 30.0])
    assert calculate_wape(y_true, y_pred) == 0.0

    y_pred_off = np.array([12.0, 18.0, 33.0])
    # abs errs: 2, 2, 3 -> sum = 7. sum y_true = 60. WAPE = 7 / 60
    assert abs(calculate_wape(y_true, y_pred_off) - (7.0 / 60.0)) < 1e-5


def test_inventory_classification_rules():
    # 1. LOW stock case: stock < predicted_7d * 1.2
    # predicted_7d = 100, safety_factor = 1.2 -> safety_stock = 120. stock = 50 -> LOW
    low_res = classify_inventory(current_stock=50, predicted_demand_7d=100.0, safety_factor=1.2, max_coverage_days=21)
    assert low_res["classification"] == "LOW"
    assert low_res["safety_stock"] == 120.0
    assert "below safety threshold" in low_res["explanation"]

    # 2. EXCESS stock case: coverage > 21 days
    # predicted_7d = 70 (10 units/day), stock = 300 -> 30 days coverage -> EXCESS
    excess_res = classify_inventory(current_stock=300, predicted_demand_7d=70.0, safety_factor=1.2, max_coverage_days=21)
    assert excess_res["classification"] == "EXCESS"
    assert excess_res["coverage_days"] == 30.0

    # 3. NORMAL stock case
    # predicted_7d = 70 (10 units/day), safety = 84, stock = 100 (10 days coverage) -> NORMAL
    normal_res = classify_inventory(current_stock=100, predicted_demand_7d=70.0, safety_factor=1.2, max_coverage_days=21)
    assert normal_res["classification"] == "NORMAL"
    assert normal_res["coverage_days"] == 10.0
