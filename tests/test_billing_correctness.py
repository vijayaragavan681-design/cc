import pytest


def test_successful_checkout_and_fefo(retail_client, customer_headers, mock_dynamodb):
    """
    Verifies that customer checkout succeeds, deducts stock atomically via FEFO,
    and returns a bill with authoritative prices.
    """
    payload = {
        "storeId": "STORE001",
        "items": [
            {"productId": "PROD001", "quantity": 25}
        ],
        "idempotencyKey": "test-key-001",
    }

    response = retail_client.post("/api/billing/checkout", json=payload, headers=customer_headers)
    assert response.status_code == 200
    bill = response.json()

    assert bill["storeId"] == "STORE001"
    assert bill["customerId"] == "cust-001"
    assert len(bill["items"]) == 1

    item = bill["items"][0]
    assert item["productId"] == "PROD001"
    assert item["quantity"] == 25
    assert item["unitPrice"] == 3.99
    assert item["subtotal"] == 99.75

    # Check FEFO batch deductions:
    # Batch 1 had 20 units (exp: 2026-12-31), Batch 2 had 30 units (exp: 2027-01-15)
    # 25 units deducted should take ALL 20 from Batch 1 and 5 from Batch 2
    deductions = item["batchDeductions"]
    assert len(deductions) == 2
    assert deductions[0]["batchId"] == "PROD001-B1"
    assert deductions[0]["quantity"] == 20
    assert deductions[1]["batchId"] == "PROD001-B2"
    assert deductions[1]["quantity"] == 5

    # Verify inventory in database was updated from 50 to 25
    inv_item = mock_dynamodb["inventory"].get_item({"storeId": "STORE001", "productId": "PROD001"})["Item"]
    assert int(inv_item["totalStock"]) == 25


def test_duplicate_checkout_idempotency(retail_client, customer_headers, mock_dynamodb):
    """
    Submitting the exact same checkout payload with the same idempotency key must
    return the existing bill and NOT deduct stock a second time.
    """
    payload = {
        "storeId": "STORE001",
        "items": [{"productId": "PROD001", "quantity": 10}],
        "idempotencyKey": "unique-idempotency-key-123",
    }

    # First attempt
    res1 = retail_client.post("/api/billing/checkout", json=payload, headers=customer_headers)
    assert res1.status_code == 200
    bill1 = res1.json()

    inv_after_1 = int(mock_dynamodb["inventory"].get_item({"storeId": "STORE001", "productId": "PROD001"})["Item"]["totalStock"])
    assert inv_after_1 == 40

    # Duplicate attempt with identical idempotency key
    res2 = retail_client.post("/api/billing/checkout", json=payload, headers=customer_headers)
    assert res2.status_code == 200
    bill2 = res2.json()

    assert bill1["saleId"] == bill2["saleId"]

    # Stock must remain at 40 (not 30)
    inv_after_2 = int(mock_dynamodb["inventory"].get_item({"storeId": "STORE001", "productId": "PROD001"})["Item"]["totalStock"])
    assert inv_after_2 == 40


def test_insufficient_stock_rejection(retail_client, customer_headers):
    """Checkout must fail with 400 Bad Request if requested units exceed available stock."""
    payload = {
        "storeId": "STORE001",
        "items": [{"productId": "PROD001", "quantity": 9999}],
    }
    response = retail_client.post("/api/billing/checkout", json=payload, headers=customer_headers)
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


def test_nonexistent_product_checkout(retail_client, customer_headers):
    """Checkout must fail with 404 if product does not exist in store."""
    payload = {
        "storeId": "STORE001",
        "items": [{"productId": "PROD_NONEXISTENT", "quantity": 1}],
    }
    response = retail_client.post("/api/billing/checkout", json=payload, headers=customer_headers)
    assert response.status_code == 404


def test_customer_bills_isolation(retail_client, customer_headers):
    """Customer can query their own bills."""
    # First complete a checkout
    retail_client.post(
        "/api/billing/checkout",
        json={"storeId": "STORE001", "items": [{"productId": "PROD001", "quantity": 2}]},
        headers=customer_headers,
    )

    response = retail_client.get("/api/billing/my-bills", headers=customer_headers)
    assert response.status_code == 200
    bills = response.json()
    assert len(bills) >= 1
    assert bills[0]["customerId"] == "cust-001"


def test_store_owner_cannot_checkout_as_customer(retail_client, store001_owner_headers):
    """Store owners are restricted from customer checkout."""
    payload = {
        "storeId": "STORE001",
        "items": [{"productId": "PROD001", "quantity": 1}],
    }
    response = retail_client.post("/api/billing/checkout", json=payload, headers=store001_owner_headers)
    assert response.status_code == 403
