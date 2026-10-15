import os
import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Fix seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

STORES = [
    {"store_id": "STORE001", "name": "Downtown Flagship", "multiplier": 1.25},
    {"store_id": "STORE002", "name": "Suburban Market", "multiplier": 1.0},
    {"store_id": "STORE003", "name": "Uptown Express", "multiplier": 0.85},
]

PRODUCTS = [
    # Produce
    {"id": "PROD001", "name": "Organic Gala Apples 1kg", "category": "Produce", "base_price": 3.99, "base_demand": 18, "shelf_life": 14},
    {"id": "PROD002", "name": "Fresh Baby Spinach 250g", "category": "Produce", "base_price": 2.49, "base_demand": 24, "shelf_life": 7},
    {"id": "PROD003", "name": "Ripe Hass Avocados 4pk", "category": "Produce", "base_price": 4.99, "base_demand": 15, "shelf_life": 8},
    {"id": "PROD004", "name": "Sweet Valencia Oranges 2kg", "category": "Produce", "base_price": 5.49, "base_demand": 12, "shelf_life": 16},
    {"id": "PROD005", "name": "Cherry Tomatoes 500g", "category": "Produce", "base_price": 3.29, "base_demand": 16, "shelf_life": 9},

    # Dairy & Eggs
    {"id": "PROD006", "name": "Organic Whole Milk 1L", "category": "Dairy", "base_price": 2.99, "base_demand": 35, "shelf_life": 10},
    {"id": "PROD007", "name": "Greek Yogurt Plain 500g", "category": "Dairy", "base_price": 4.29, "base_demand": 20, "shelf_life": 18},
    {"id": "PROD008", "name": "Free Range Large Eggs 12pk", "category": "Dairy", "base_price": 4.89, "base_demand": 28, "shelf_life": 24},
    {"id": "PROD009", "name": "Salted Butter 250g", "category": "Dairy", "base_price": 3.79, "base_demand": 14, "shelf_life": 45},
    {"id": "PROD010", "name": "Sharp Cheddar Cheese 200g", "category": "Dairy", "base_price": 4.99, "base_demand": 17, "shelf_life": 60},

    # Bakery
    {"id": "PROD011", "name": "Artisan Sourdough Loaf", "category": "Bakery", "base_price": 4.49, "base_demand": 22, "shelf_life": 5},
    {"id": "PROD012", "name": "Whole Grain Bread 700g", "category": "Bakery", "base_price": 3.19, "base_demand": 30, "shelf_life": 7},
    {"id": "PROD013", "name": "Butter Croissants 4pk", "category": "Bakery", "base_price": 4.99, "base_demand": 16, "shelf_life": 4},
    {"id": "PROD014", "name": "Plain Bagels 6pk", "category": "Bakery", "base_price": 3.49, "base_demand": 19, "shelf_life": 6},
    {"id": "PROD015", "name": "Chocolate Chip Muffins 4pk", "category": "Bakery", "base_price": 4.29, "base_demand": 14, "shelf_life": 5},

    # Meat & Seafood
    {"id": "PROD016", "name": "Boneless Chicken Breast 500g", "category": "Meat", "base_price": 6.99, "base_demand": 25, "shelf_life": 6},
    {"id": "PROD017", "name": "Grass Fed Ground Beef 500g", "category": "Meat", "base_price": 7.49, "base_demand": 22, "shelf_life": 6},
    {"id": "PROD018", "name": "Fresh Atlantic Salmon Fillet", "category": "Meat", "base_price": 10.99, "base_demand": 13, "shelf_life": 4},
    {"id": "PROD019", "name": "Pork Loin Chops 400g", "category": "Meat", "base_price": 6.49, "base_demand": 11, "shelf_life": 7},
    {"id": "PROD020", "name": "Smoked Turkey Slices 150g", "category": "Meat", "base_price": 3.99, "base_demand": 18, "shelf_life": 20},

    # Beverages
    {"id": "PROD021", "name": "Cold Pressed Orange Juice 1L", "category": "Beverages", "base_price": 4.99, "base_demand": 21, "shelf_life": 14},
    {"id": "PROD022", "name": "Sparkling Spring Water 6x500ml", "category": "Beverages", "base_price": 5.29, "base_demand": 26, "shelf_life": 180},
    {"id": "PROD023", "name": "Dark Roast Coffee Beans 500g", "category": "Beverages", "base_price": 9.99, "base_demand": 12, "shelf_life": 180},
    {"id": "PROD024", "name": "Organic Green Tea 40 bags", "category": "Beverages", "base_price": 4.19, "base_demand": 10, "shelf_life": 365},
    {"id": "PROD025", "name": "Oat Milk Barista Blend 1L", "category": "Beverages", "base_price": 3.89, "base_demand": 23, "shelf_life": 45},

    # Pantry & Snacks
    {"id": "PROD026", "name": "Extra Virgin Olive Oil 750ml", "category": "Pantry", "base_price": 11.49, "base_demand": 8, "shelf_life": 365},
    {"id": "PROD027", "name": "Italian Penne Rigate 500g", "category": "Pantry", "base_price": 1.99, "base_demand": 27, "shelf_life": 365},
    {"id": "PROD028", "name": "Organic Marinara Sauce 680g", "category": "Pantry", "base_price": 3.99, "base_demand": 20, "shelf_life": 240},
    {"id": "PROD029", "name": "Roasted Salted Almonds 200g", "category": "Pantry", "base_price": 4.99, "base_demand": 15, "shelf_life": 120},
    {"id": "PROD030", "name": "Dark Chocolate 70% 100g", "category": "Pantry", "base_price": 2.79, "base_demand": 19, "shelf_life": 180},
]


def generate_synthetic_data(num_days: int = 200, output_path: str = "ml/data/synthetic_sales.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    start_date = datetime(2026, 1, 1)
    records = []

    print(f"Generating synthetic sales data: {num_days} days, {len(STORES)} stores, {len(PRODUCTS)} products...")

    for store in STORES:
        store_id = store["store_id"]
        store_mult = store["multiplier"]

        for prod in PRODUCTS:
            prod_id = prod["id"]
            prod_name = prod["name"]
            category = prod["category"]
            base_price = prod["base_price"]
            base_demand = prod["base_demand"]
            shelf_life = prod["shelf_life"]

            # Initialize starting stock
            current_stock = int(base_demand * store_mult * random.uniform(3, 7))

            for day_idx in range(num_days):
                curr_date = start_date + timedelta(days=day_idx)
                day_of_week = curr_date.weekday()
                is_weekend = 1 if day_of_week in [4, 5, 6] else 0  # Fri, Sat, Sun weekend peak
                month = curr_date.month

                # Periodic promotions every ~25 days with 10% discount and 40% demand boost
                is_promotion = 1 if ((day_idx + int(prod_id[-2:])) % 24 < 3) else 0
                price = round(base_price * (0.88 if is_promotion else 1.0), 2)

                # Day of week seasonality
                dow_mult = 1.0
                if day_of_week == 5:  # Saturday peak
                    dow_mult = 1.35
                elif day_of_week == 6:  # Sunday peak
                    dow_mult = 1.25
                elif day_of_week == 4:  # Friday
                    dow_mult = 1.15
                elif day_of_week in [1, 2]:  # Tuesday, Wednesday slower
                    dow_mult = 0.88

                promo_mult = 1.45 if is_promotion else 1.0

                # Occasional demand spike (e.g. holiday or local event)
                spike_mult = 1.6 if random.random() < 0.03 else 1.0

                # Latent true unconstrained demand
                mean_demand = base_demand * store_mult * dow_mult * promo_mult * spike_mult
                noise = np.random.normal(0, max(1.5, mean_demand * 0.12))
                unconstrained_demand = max(0, int(round(mean_demand + noise)))

                # Stock replenishment every 4-7 days or when stock is critically low
                replenishment = 0
                if current_stock < (base_demand * store_mult * 1.5) or (day_idx % 5 == 0 and random.random() < 0.8):
                    replenishment = int(base_demand * store_mult * random.randint(4, 9))
                    current_stock += replenishment

                # Available stock before sales
                available_stock = current_stock

                # Observed sales censored by stock availability
                units_sold = min(unconstrained_demand, available_stock)
                stockout = 1 if (available_stock <= units_sold and unconstrained_demand > available_stock) else 0

                # Decrement stock by units sold
                current_stock -= units_sold

                # Simulate batch expiry date for inventory tracking
                batch_expiry = (curr_date + timedelta(days=shelf_life)).strftime("%Y-%m-%d")

                records.append({
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "store_id": store_id,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "category": category,
                    "price": price,
                    "available_stock": available_stock,
                    "replenishment_quantity": replenishment,
                    "day_of_week": day_of_week,
                    "month": month,
                    "is_weekend": is_weekend,
                    "is_promotion": is_promotion,
                    "unconstrained_demand": unconstrained_demand,
                    "units_sold": units_sold,
                    "stockout": stockout,
                    "shelf_life_days": shelf_life,
                    "expiry_date": batch_expiry,
                })

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"Synthetic dataset saved to {output_path} ({len(df)} rows, {len(df.columns)} columns).")
    print("Columns:", list(df.columns))
    return df


if __name__ == "__main__":
    generate_synthetic_data()
