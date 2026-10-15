def test_missing_auth_header_rejection(retail_client, inventory_client, warehouse_client):
    # Unauthenticated requests to protected endpoints must be rejected with 401
    res1 = retail_client.get("/api/billing/my-bills")
    assert res1.status_code == 401

    res2 = inventory_client.get("/api/inventory/STORE001")
    assert res2.status_code == 401

    res3 = warehouse_client.get("/api/warehouse/requests?store_id=STORE001")
    assert res3.status_code == 401


def test_customer_denied_store_owner_routes(inventory_client, customer_headers):
    # Customer cannot access store owner inventory
    response = inventory_client.get("/api/inventory/STORE001", headers=customer_headers)
    assert response.status_code == 403
    assert "Requires role 'STORE_OWNER'" in response.json()["detail"]


def test_cross_store_access_denial(inventory_client, retail_client, store001_owner_headers):
    """
    Store owner assigned to STORE001 MUST NOT be able to access STORE002
    by altering the storeId URL parameter.
    """
    # Attempting to access STORE002 with STORE001 owner credentials
    response = inventory_client.get("/api/inventory/STORE002", headers=store001_owner_headers)
    assert response.status_code == 403
    assert "Store isolation violation" in response.json()["detail"]
    assert "STORE001" in response.json()["detail"]
    assert "STORE002" in response.json()["detail"]

    # Same store owner accessing STORE001 must succeed
    allowed_response = inventory_client.get("/api/inventory/STORE001", headers=store001_owner_headers)
    assert allowed_response.status_code == 200


def test_warehouse_cross_store_denial(warehouse_client, store001_owner_headers):
    # STORE001 owner cannot query STORE002 requests
    response = warehouse_client.get("/api/warehouse/requests?store_id=STORE002", headers=store001_owner_headers)
    assert response.status_code == 403
    assert "Store isolation violation" in response.json()["detail"]
