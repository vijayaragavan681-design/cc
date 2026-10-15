# Machine Learning Demand Forecasting & Training Guide

This guide details the synthetic dataset generation, feature engineering, chronological splitting, training pipeline, evaluation metrics, and inference classification for the Smart Retail demand forecasting model.

---

## 1. Machine Learning Objective

The objective is to predict the **expected units sold over the next 7 days** ($\text{Target}_{t} = \sum_{k=1}^7 \text{units\_sold}_{t+k}$) for each store-product combination:
- **Stores:** `STORE001`, `STORE002`, `STORE003`.
- **Products:** 30 distinct products across Produce, Dairy, Bakery, Meat, Beverages, and Pantry.
- **Horizon:** 7 days forward.

---

## 2. Synthetic Dataset Generation (`ml/generate_dataset.py`)

A reproducible synthetic dataset is generated using a fixed random seed (`RANDOM_SEED = 42`):
- **Duration:** 200 consecutive calendar days.
- **Records:** 18,000 total observations ($3 \text{ stores} \times 30 \text{ products} \times 200 \text{ days}$).
- **Key Columns:**
  - `date`: Timestamp string `YYYY-MM-DD`.
  - `store_id`: Store identifier (`STORE001`, `STORE002`, `STORE003`).
  - `product_id`, `product_name`, `category`.
  - `price`: Authoritative selling price.
  - `available_stock`: Beginning inventory for the day.
  - `replenishment_quantity`: Inflow stock received.
  - `day_of_week`, `month`, `is_weekend`.
  - `is_promotion`: 1 if a promotion discount (12% off) is active, boosting demand.
  - `unconstrained_demand`: True latent customer demand incorporating trend, weekend peaks (Friday, Saturday, Sunday), promotion boosts, and occasional demand spikes.
  - `units_sold`: **Censored sales.** In real retail environments, actual sales cannot exceed available inventory:
    $$\text{units\_sold} = \min(\text{unconstrained\_demand}, \text{available\_stock})$$
  - `stockout`: 1 if `available_stock <= units_sold` and `unconstrained_demand > available_stock`, else 0.
  - `shelf_life_days` & `expiry_date`: Simulated batch expiry.

Run the generation script:
```bash
python ml/generate_dataset.py
```
Output is saved to `ml/data/synthetic_sales.csv`.

---

## 3. Leak-Free Feature Engineering (`ml/train_model.py`)

To prevent target leakage, all features must strictly use information observed **at or before prediction day $t$**:

### 1. Historical Lags
- `lag_0`: Observed sales on day $t$.
- `lag_1`: Observed sales on day $t-1$.
- `lag_2`: Observed sales on day $t-2$.
- `lag_3`: Observed sales on day $t-3$.
- `lag_7`: Observed sales on day $t-7$.
- `lag_14`: Observed sales on day $t-14$.

### 2. Rolling Statistics
- `rolling_mean_7d`: 7-day rolling average of daily sales up to day $t$.
- `rolling_std_7d`: 7-day rolling standard deviation of daily sales.
- `rolling_mean_14d`: 14-day rolling average.
- `rolling_mean_28d`: 28-day rolling average.

### 3. Stockout History
- `recent_stockouts_7d`: Count of stockout events in the past 7 days.

### 4. Categorical & Calendar Features
- Categorical: `store_id`, `product_id`, `category` (One-Hot Encoded).
- Numeric: `price`, `available_stock`, `day_of_week`, `month`, `is_weekend`, `is_promotion`.

---

## 4. Chronological Train / Validation / Test Split

Random splitting of time-series data causes future data leakage. The project enforces strict **chronological ordering**:

- **Train Set:** Days 1 through 140 (~70% of chronological dates).
- **Validation Set:** Days 141 through 170 (~15% of chronological dates).
- **Test Set:** Days 171 through 193 (~15% of chronological dates, reserving the final 7 days for forward target calculation).

---

## 5. Model Training & Baseline Comparison

### Simple Baseline:
7-day moving average projection:
$$\hat{y}_{\text{baseline}} = 7 \times \text{rolling\_mean\_7d}$$

### Model Architecture:
A unified scikit-learn `Pipeline`:
1. `preprocessor`: `ColumnTransformer` with `OneHotEncoder(handle_unknown='ignore')` and `StandardScaler()`.
2. `regressor`: `RandomForestRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)`.

### Evaluation Metrics on Held-Out Test Set:
$$\text{MAE} = \frac{1}{N}\sum_{i=1}^N |y_i - \hat{y}_i|$$
$$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2}$$
$$\text{WAPE} = \frac{\sum_{i=1}^N |y_i - \hat{y}_i|}{\sum_{i=1}^N y_i}$$

### Results Comparison:
| Metric | Simple Baseline (7x MA7) | Trained Random Forest | Improvement |
|---|---|---|---|
| **MAE** | 19.43 units | **11.70 units** | **+39.8%** |
| **RMSE** | 25.95 units | **15.72 units** | **+39.4%** |
| **WAPE** | 12.30% | **7.41%** | **+39.8%** |

Train and save the model:
```bash
python ml/train_model.py
```
Artifacts saved to:
- `ml/artifacts/demand_model.joblib`
- `ml/artifacts/model_metadata.json`

Evaluate the model breakdown by store and category:
```bash
python ml/evaluate_model.py
```

---

## 6. Inventory Classification Policy

The Inventory Service applies configurable mathematical rules using the predicted 7-day demand:

1. **Daily Demand Rate:**
   $$\text{Daily Demand} = \max\left(0.1, \frac{\hat{y}_{\text{pred\_7d}}}{7}\right)$$
2. **Safety Stock Threshold:**
   $$\text{Safety Stock} = \hat{y}_{\text{pred\_7d}} \times 1.2$$
3. **Estimated Inventory Coverage (Days):**
   $$\text{Coverage Days} = \frac{\text{Current Available Stock}}{\text{Daily Demand}}$$

### Classification Logic:
- **`LOW`:** If $\text{Current Stock} < \text{Safety Stock}$. Available inventory is insufficient to satisfy forecast demand plus the 20% safety buffer.
- **`EXCESS`:** If $\text{Coverage Days} > 21 \text{ days}$. Stock exceeds 3 weeks of projected sales.
- **`NORMAL`:** If stock is between the safety threshold and 21 days of coverage.
