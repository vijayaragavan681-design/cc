def test_warehouse_health(warehouse_client):
    response = warehouse_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "warehouse-service"


def test_create_replenishment_request(warehouse_client, store001_owner_headers):
    payload = {
        "storeId": "STORE001",
        "productId": "PROD001",
        "requestedQuantity": 100,
        "reason": "Depleted safety buffer following weekend surge.",
    }
    response = warehouse_client.post("/api/warehouse/requests", json=payload, headers=store001_owner_headers)
    assert response.status_code == 200
    req = response.json()
    assert req["storeId"] == "STORE001"
    assert req["productId"] == "PROD001"
    assert req["requestedQuantity"] == 100
    assert req["status"] == "PENDING"
    assert req["requestId"].startswith("REQ-")


def test_reject_invalid_quantity(warehouse_client, store001_owner_headers):
    payload = {
        "storeId": "STORE001",
        "productId": "PROD001",
        "requestedQuantity": -5,
        "reason": "Invalid negative stock",
    }
    response = warehouse_client.post("/api/warehouse/requests", json=payload, headers=store001_owner_headers)
    assert response.status_code == 422  # Pydantic validation error


def test_list_and_acknowledge_warehouse_requests(warehouse_client, store001_owner_headers, warehouse_manager_headers):
    # Store owner creates request
    create_res = warehouse_client.post(
        "/api/warehouse/requests",
        json={"storeId": "STORE001", "productId": "PROD001", "requestedQuantity": 50, "reason": "Restocking"},
        headers=store001_owner_headers,
    )
    req_id = create_res.json()["requestId"]

    # Store owner lists their store requests
    list_res = warehouse_client.get("/api/warehouse/requests?store_id=STORE001", headers=store001_owner_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(i["requestId"] == req_id for i in items)

    # Warehouse manager acknowledges
    ack_res = warehouse_client.post(
        f"/api/warehouse/requests/{req_id}/acknowledge?store_id=STORE001",
        headers=warehouse_manager_headers,
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"


def test_approve_and_reject_warehouse_request(warehouse_client, store001_owner_headers, warehouse_manager_headers):
    # Create request as store owner
    create_res = warehouse_client.post(
        "/api/warehouse/requests",
        json={"storeId": "STORE001", "productId": "PROD002", "requestedQuantity": 30, "reason": "Low stock replenishment"},
        headers=store001_owner_headers,
    )
    req_id = create_res.json()["requestId"]

    # Store owner is NOT permitted to approve (must get 403 Forbidden)
    forbidden_res = warehouse_client.post(
        f"/api/warehouse/requests/{req_id}/status?status=APPROVED&store_id=STORE001",
        headers=store001_owner_headers,
    )
    assert forbidden_res.status_code == 403

    # Warehouse Manager approves
    app_res = warehouse_client.post(
        f"/api/warehouse/requests/{req_id}/status?status=APPROVED&store_id=STORE001",
        headers=warehouse_manager_headers,
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"

    # Warehouse Manager rejects
    rej_res = warehouse_client.post(
        f"/api/warehouse/requests/{req_id}/status?status=REJECTED&store_id=STORE001",
        headers=warehouse_manager_headers,
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"
