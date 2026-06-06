def test_get_banned_companies_empty(client):
    response = client.get("/banned-companies")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["total"] == 0
    assert response.json()["data"] == []


def test_create_banned_company(client):
    payload = {"name": "test_name"}
    response = client.post("/banned-companies", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["name"] == "test_name"



def test_create_banned_company_duplicate(client):
    payload = {"name": "test_name"}
    client.post("/banned-companies", json=payload)
    response = client.post("/banned-companies", json=payload)
    assert response.status_code == 400


def test_update_banned_company_put(client):
    setup_payload = {"name": "test_name"}
    setup_resp = client.post("/banned-companies", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    update_payload = {"name": "updated_name"}
    response = client.put(f"/banned-companies/{pk_val}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["name"] == "updated_name"


def test_update_banned_company_patch(client):
    setup_payload = {"name": "test_name"}
    setup_resp = client.post("/banned-companies", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    patch_payload = {"name": "patched_name"}
    response = client.patch(f"/banned-companies/{pk_val}", json=patch_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["name"] == "patched_name"


def test_delete_banned_company(client):
    setup_payload = {"name": "test_name"}
    setup_resp = client.post("/banned-companies", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    response = client.delete(f"/banned-companies/{pk_val}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    verify_resp = client.get("/banned-companies")
    assert verify_resp.json()["total"] == 0
