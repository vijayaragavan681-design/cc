def test_inventory_health(inventory_client):
    response = inventory_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "inventory-ml-service"


def test_get_store_inventory_as_owner(inventory_client, store001_owner_headers):
    response = inventory_client.get("/api/inventory/STORE001", headers=store001_owner_headers)
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["storeId"] == "STORE001"


def test_get_model_info(inventory_client):
    response = inventory_client.get("/api/ml/model-info")
    assert response.status_code == 200
    info = response.json()
    assert "model_version" in info
    assert "evaluation_metrics" in info


def test_run_predictions_for_store(inventory_client, store001_owner_headers):
    response = inventory_client.post("/api/inventory/STORE001/predictions/run", headers=store001_owner_headers)
    assert response.status_code == 200
    preds = response.json()
    assert len(preds) >= 1
    p = preds[0]
    assert p["storeId"] == "STORE001"
    assert "predictedDemand7d" in p
    assert "safetyStock" in p
    assert p["classification"] in ["LOW", "NORMAL", "EXCESS"]
    assert "explanation" in p


def test_get_product_prediction(inventory_client, store001_owner_headers):
    response = inventory_client.get("/api/inventory/STORE001/predictions/PROD001", headers=store001_owner_headers)
    assert response.status_code == 200
    pred = response.json()
    assert pred["productId"] == "PROD001"
    assert pred["storeId"] == "STORE001"
    assert pred["classification"] in ["LOW", "NORMAL", "EXCESS"]
