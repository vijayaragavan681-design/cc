import json
import os
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_SEED = 42


def build_features_and_target(df: pd.DataFrame, forecast_horizon: int = 7):
    """
    Constructs leak-free feature matrix and chronological forward target.
    Target: sum of units_sold over the NEXT 7 days (t+1 through t+7).
    Features: only historical observations up to and including day t.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["store_id", "product_id", "date"]).reset_index(drop=True)

    grouped = df.groupby(["store_id", "product_id"])

    # 1. Forward target: 7-day sum of FUTURE units_sold (strictly t+1 to t+7)
    # Using shift(-forecast_horizon) rolling window
    indexer = pd.api.indexers.FixedForwardWindowIndexer(window_size=forecast_horizon)
    # Shift by -1 to exclude current day t from target, then take forward window of size 7
    df["target_demand_7d"] = grouped["units_sold"].transform(
        lambda s: s.iloc[::-1].rolling(window=forecast_horizon, closed="left").sum().iloc[::-1]
    )

    # 2. Historical Lags (day t, t-1, t-2, t-6, t-13)
    df["lag_0"] = df["units_sold"]  # current day sales
    df["lag_1"] = grouped["units_sold"].shift(1)
    df["lag_2"] = grouped["units_sold"].shift(2)
    df["lag_3"] = grouped["units_sold"].shift(3)
    df["lag_7"] = grouped["units_sold"].shift(7)
    df["lag_14"] = grouped["units_sold"].shift(14)

    # 3. Rolling Statistics over past sales (closed='right' includes day t, or closed='left')
    df["rolling_mean_7d"] = grouped["units_sold"].transform(lambda s: s.rolling(7, min_periods=3).mean())
    df["rolling_std_7d"] = grouped["units_sold"].transform(lambda s: s.rolling(7, min_periods=3).std().fillna(0))
    df["rolling_mean_14d"] = grouped["units_sold"].transform(lambda s: s.rolling(14, min_periods=7).mean())
    df["rolling_mean_28d"] = grouped["units_sold"].transform(lambda s: s.rolling(28, min_periods=14).mean())

    # 4. Stockout history in past 7 days
    df["recent_stockouts_7d"] = grouped["stockout"].transform(lambda s: s.rolling(7, min_periods=1).sum())

    # Drop rows without enough history (first 28 days) or without full future target (last 7 days)
    df_clean = df.dropna(subset=["target_demand_7d", "rolling_mean_28d", "lag_14"]).copy()
    df_clean = df_clean.sort_values("date").reset_index(drop=True)
    return df_clean


def calculate_wape(y_true, y_pred) -> float:
    """Weighted Absolute Percentage Error (WAPE = sum(|y - y_hat|) / sum(y))."""
    denominator = np.sum(y_true)
    if denominator == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / denominator)


def train_and_save_model(
    data_path: str = "ml/data/synthetic_sales.csv",
    artifact_dir: str = "ml/artifacts",
    model_version: str = "1.0.0"
):
    os.makedirs(artifact_dir, exist_ok=True)

    print(f"Loading data from {data_path}...")
    raw_df = pd.read_csv(data_path)
    df = build_features_and_target(raw_df, forecast_horizon=7)

    # Chronological Train / Val / Test Split
    unique_dates = sorted(df["date"].unique())
    n_dates = len(unique_dates)

    train_cutoff_idx = int(n_dates * 0.70)
    val_cutoff_idx = int(n_dates * 0.85)

    train_end_date = unique_dates[train_cutoff_idx]
    val_end_date = unique_dates[val_cutoff_idx]

    train_mask = df["date"] <= train_end_date
    val_mask = (df["date"] > train_end_date) & (df["date"] <= val_end_date)
    test_mask = df["date"] > val_end_date

    print(f"Date ranges: Train <= {train_end_date.strftime('%Y-%m-%d')}, "
          f"Val <= {val_end_date.strftime('%Y-%m-%d')}, "
          f"Test > {val_end_date.strftime('%Y-%m-%d')}")

    categorical_features = ["store_id", "product_id", "category"]
    numerical_features = [
        "price",
        "available_stock",
        "day_of_week",
        "month",
        "is_weekend",
        "is_promotion",
        "lag_0",
        "lag_1",
        "lag_2",
        "lag_3",
        "lag_7",
        "lag_14",
        "rolling_mean_7d",
        "rolling_std_7d",
        "rolling_mean_14d",
        "rolling_mean_28d",
        "recent_stockouts_7d",
    ]

    all_features = categorical_features + numerical_features
    target = "target_demand_7d"

    X_train = df.loc[train_mask, all_features]
    y_train = df.loc[train_mask, target]

    X_val = df.loc[val_mask, all_features]
    y_val = df.loc[val_mask, target]

    X_test = df.loc[test_mask, all_features]
    y_test = df.loc[test_mask, target]

    print(f"Train samples: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # Simple Baseline on Test: 7 * rolling_mean_7d
    baseline_pred = df.loc[test_mask, "rolling_mean_7d"] * 7
    baseline_mae = mean_absolute_error(y_test, baseline_pred)
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))
    baseline_wape = calculate_wape(y_test, baseline_pred)

    print("\n--- BASELINE EVALUATION (Simple 7x Moving Average) ---")
    print(f"Baseline MAE:  {baseline_mae:.2f}")
    print(f"Baseline RMSE: {baseline_rmse:.2f}")
    print(f"Baseline WAPE: {baseline_wape * 100:.2f}%")

    # Build scikit-learn Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numerical_features),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=120,
        max_depth=12,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", model),
    ])

    print("\nTraining RandomForest demand forecasting pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluation on Test set
    y_test_pred = pipeline.predict(X_test)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))
    test_wape = calculate_wape(y_test, y_test_pred)

    print("\n--- TRAINED MODEL EVALUATION (Test Set) ---")
    print(f"Model MAE:  {test_mae:.2f} (vs Baseline {baseline_mae:.2f})")
    print(f"Model RMSE: {test_rmse:.2f} (vs Baseline {baseline_rmse:.2f})")
    print(f"Model WAPE: {test_wape * 100:.2f}% (vs Baseline {baseline_wape * 100:.2f}%)")

    # Save Pipeline Artifact
    model_artifact_path = os.path.join(artifact_dir, "demand_model.joblib")
    joblib.dump(pipeline, model_artifact_path)
    print(f"\nTrained model artifact saved to {model_artifact_path}")

    # Save Metadata
    metadata = {
        "model_version": model_version,
        "training_date": datetime.utcnow().isoformat(),
        "dataset_version": "synthetic_sales_v1",
        "feature_names": all_features,
        "categorical_features": categorical_features,
        "numerical_features": numerical_features,
        "evaluation_metrics": {
            "test_mae": round(test_mae, 4),
            "test_rmse": round(test_rmse, 4),
            "test_wape": round(test_wape, 4),
            "baseline_mae": round(baseline_mae, 4),
            "baseline_rmse": round(baseline_rmse, 4),
            "baseline_wape": round(baseline_wape, 4),
        },
        "training_config": {
            "n_estimators": 120,
            "max_depth": 12,
            "random_seed": RANDOM_SEED,
            "forecast_horizon_days": 7,
        },
    }

    metadata_path = os.path.join(artifact_dir, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Model metadata saved to {metadata_path}")

    return pipeline, metadata


if __name__ == "__main__":
    train_and_save_model()
