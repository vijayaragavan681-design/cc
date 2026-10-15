import os
import joblib
import pandas as pd


def classify_inventory(current_stock: int, predicted_demand_7d: float, safety_factor: float = 1.2, max_coverage_days: int = 21):
    """
    Mathematical rules for inventory classification:
    - Daily demand estimate = predicted_demand_7d / 7.0
    - Safety stock = predicted_demand_7d * safety_factor
    - Coverage days = current_stock / daily_demand (if daily_demand > 0)
    - LOW: available stock < safety_stock
    - EXCESS: coverage days > max_coverage_days (e.g. 21 days / 3 weeks)
    - NORMAL: between safety_stock and max coverage
    """
    daily_demand = max(0.1, predicted_demand_7d / 7.0)
    safety_stock = round(predicted_demand_7d * safety_factor, 1)
    coverage_days = round(current_stock / daily_demand, 1)

    if current_stock < safety_stock:
        classification = "LOW"
        explanation = (
            f"Stock ({current_stock}) is below safety threshold ({safety_stock} units = "
            f"{predicted_demand_7d:.1f} predicted demand * {safety_factor}x buffer). "
            f"Current coverage is only {coverage_days} days."
        )
    elif coverage_days > max_coverage_days:
        classification = "EXCESS"
        explanation = (
            f"Stock ({current_stock}) provides {coverage_days} days of coverage, exceeding "
            f"the maximum policy threshold of {max_coverage_days} days. Risk of overstocking or expiry."
        )
    else:
        classification = "NORMAL"
        explanation = (
            f"Stock ({current_stock}) is optimal. Expected coverage is {coverage_days} days "
            f"(predicted 7-day demand is {predicted_demand_7d:.1f} units)."
        )

    return {
        "classification": classification,
        "safety_stock": safety_stock,
        "coverage_days": coverage_days,
        "explanation": explanation,
    }


def predict_sample():
    model_path = "ml/artifacts/demand_model.joblib"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at {model_path}. Run train_model.py first.")

    pipeline = joblib.load(model_path)

    sample_items = [
        {
            "store_id": "STORE001",
            "product_id": "PROD006",
            "product_name": "Organic Whole Milk 1L",
            "category": "Dairy",
            "price": 2.99,
            "available_stock": 25,  # Low stock test
            "day_of_week": 4,
            "month": 10,
            "is_weekend": 1,
            "is_promotion": 0,
            "lag_0": 42.0,
            "lag_1": 38.0,
            "lag_2": 35.0,
            "lag_3": 34.0,
            "lag_7": 40.0,
            "lag_14": 36.0,
            "rolling_mean_7d": 37.5,
            "rolling_std_7d": 3.2,
            "rolling_mean_14d": 36.8,
            "rolling_mean_28d": 36.0,
            "recent_stockouts_7d": 0,
        },
        {
            "store_id": "STORE002",
            "product_id": "PROD011",
            "product_name": "Artisan Sourdough Loaf",
            "category": "Bakery",
            "price": 4.49,
            "available_stock": 140,  # Normal stock test
            "day_of_week": 2,
            "month": 10,
            "is_weekend": 0,
            "is_promotion": 0,
            "lag_0": 18.0,
            "lag_1": 19.0,
            "lag_2": 17.0,
            "lag_3": 20.0,
            "lag_7": 18.0,
            "lag_14": 19.0,
            "rolling_mean_7d": 18.5,
            "rolling_std_7d": 1.5,
            "rolling_mean_14d": 18.8,
            "rolling_mean_28d": 18.2,
            "recent_stockouts_7d": 0,
        },
        {
            "store_id": "STORE003",
            "product_id": "PROD026",
            "product_name": "Extra Virgin Olive Oil 750ml",
            "category": "Pantry",
            "price": 11.49,
            "available_stock": 350,  # Excess stock test
            "day_of_week": 0,
            "month": 10,
            "is_weekend": 0,
            "is_promotion": 0,
            "lag_0": 6.0,
            "lag_1": 7.0,
            "lag_2": 6.0,
            "lag_3": 5.0,
            "lag_7": 7.0,
            "lag_14": 6.0,
            "rolling_mean_7d": 6.3,
            "rolling_std_7d": 0.8,
            "rolling_mean_14d": 6.5,
            "rolling_mean_28d": 6.2,
            "recent_stockouts_7d": 0,
        },
    ]

    df_samples = pd.DataFrame(sample_items)
    feature_cols = [
        "store_id", "product_id", "category", "price", "available_stock",
        "day_of_week", "month", "is_weekend", "is_promotion",
        "lag_0", "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
        "rolling_mean_7d", "rolling_std_7d", "rolling_mean_14d",
        "rolling_mean_28d", "recent_stockouts_7d"
    ]

    predictions = pipeline.predict(df_samples[feature_cols])

    print("================ SAMPLE DEMAND PREDICTIONS ================")
    for idx, item in enumerate(sample_items):
        pred_7d = max(0.0, float(predictions[idx]))
        analysis = classify_inventory(
            current_stock=item["available_stock"],
            predicted_demand_7d=pred_7d,
            safety_factor=1.2,
            max_coverage_days=21,
        )
        print(f"\nProduct: {item['product_name']} ({item['product_id']}) at Store: {item['store_id']}")
        print(f"Current Stock:          {item['available_stock']} units")
        print(f"Predicted 7-Day Demand: {pred_7d:.1f} units")
        print(f"Safety Stock Target:    {analysis['safety_stock']} units")
        print(f"Estimated Coverage:     {analysis['coverage_days']} days")
        print(f"Classification:         [{analysis['classification']}]")
        print(f"Explanation:            {analysis['explanation']}")


if __name__ == "__main__":
    predict_sample()
