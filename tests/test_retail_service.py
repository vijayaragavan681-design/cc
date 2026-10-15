def test_retail_health(retail_client):
    response = retail_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "retail-store-service"


def test_list_stores(retail_client):
    response = retail_client.get("/api/stores")
    assert response.status_code == 200
    stores = response.json()
    assert len(stores) >= 3
    store_ids = [s["storeId"] for s in stores]
    assert "STORE001" in store_ids
    assert "STORE002" in store_ids
    assert "STORE003" in store_ids


def test_get_store_products(retail_client, customer_headers):
    response = retail_client.get("/api/stores/STORE001/products", headers=customer_headers)
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 1
    assert products[0]["storeId"] == "STORE001"
    assert products[0]["productId"] == "PROD001"


def test_get_product_detail(retail_client, customer_headers):
    response = retail_client.get("/api/stores/STORE001/products/PROD001", headers=customer_headers)
    assert response.status_code == 200
    prod = response.json()
    assert prod["productId"] == "PROD001"
    assert prod["totalStock"] == 50
    assert len(prod["batches"]) == 2


def test_get_nonexistent_product(retail_client, customer_headers):
    response = retail_client.get("/api/stores/STORE001/products/NON_EXISTENT", headers=customer_headers)
    assert response.status_code == 404
