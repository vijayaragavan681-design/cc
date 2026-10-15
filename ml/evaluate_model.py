import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from ml.train_model import build_features_and_target, calculate_wape


def evaluate_saved_model(
    model_path: str = "ml/artifacts/demand_model.joblib",
    metadata_path: str = "ml/artifacts/model_metadata.json",
    data_path: str = "ml/data/synthetic_sales.csv",
):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at {model_path}. Run train_model.py first.")

    pipeline = joblib.load(model_path)
    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    print(f"Loaded Model Version: {metadata['model_version']}, Trained: {metadata['training_date']}")

    raw_df = pd.read_csv(data_path)
    df = build_features_and_target(raw_df, forecast_horizon=7)

    # Use test period
    unique_dates = sorted(df["date"].unique())
    val_cutoff_idx = int(len(unique_dates) * 0.85)
    test_df = df[df["date"] > unique_dates[val_cutoff_idx]].copy()

    features = metadata["feature_names"]
    X_test = test_df[features]
    y_test = test_df["target_demand_7d"]

    predictions = pipeline.predict(X_test)
    test_df["predicted_demand_7d"] = predictions
    test_df["baseline_pred"] = test_df["rolling_mean_7d"] * 7

    overall_mae = mean_absolute_error(y_test, predictions)
    overall_rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    overall_wape = calculate_wape(y_test, predictions)

    base_mae = mean_absolute_error(y_test, test_df["baseline_pred"])
    base_rmse = float(np.sqrt(mean_squared_error(y_test, test_df["baseline_pred"])))
    base_wape = calculate_wape(y_test, test_df["baseline_pred"])

    print("\n================== OVERALL EVALUATION ==================")
    print(f"{'Metric':<10} | {'Random Forest':<15} | {'Baseline (MA7)':<15} | {'Improvement':<12}")
    print("-" * 60)
    print(f"{'MAE':<10} | {overall_mae:<15.2f} | {base_mae:<15.2f} | {(base_mae - overall_mae) / base_mae * 100:.1f}%")
    print(f"{'RMSE':<10} | {overall_rmse:<15.2f} | {base_rmse:<15.2f} | {(base_rmse - overall_rmse) / base_rmse * 100:.1f}%")
    print(f"{'WAPE':<10} | {overall_wape*100:<14.2f}% | {base_wape*100:<14.2f}% | {(base_wape - overall_wape) / base_wape * 100:.1f}%")

    print("\n================ EVALUATION BY STORE ================")
    for store_id, group in test_df.groupby("store_id"):
        s_mae = mean_absolute_error(group["target_demand_7d"], group["predicted_demand_7d"])
        s_wape = calculate_wape(group["target_demand_7d"], group["predicted_demand_7d"])
        print(f"Store {store_id}: MAE = {s_mae:.2f}, WAPE = {s_wape*100:.2f}% (Samples: {len(group)})")

    print("\n=============== EVALUATION BY CATEGORY ===============")
    for cat, group in test_df.groupby("category"):
        c_mae = mean_absolute_error(group["target_demand_7d"], group["predicted_demand_7d"])
        c_wape = calculate_wape(group["target_demand_7d"], group["predicted_demand_7d"])
        print(f"Category {cat:<12}: MAE = {c_mae:.2f}, WAPE = {c_wape*100:.2f}%")


if __name__ == "__main__":
    evaluate_saved_model()
