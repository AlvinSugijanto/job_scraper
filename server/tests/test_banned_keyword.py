def test_get_banned_keywords_empty(client):
    response = client.get("/banned-keywords")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["total"] == 0
    assert response.json()["data"] == []


def test_create_banned_keyword(client):
    payload = {"keyword": "test_keyword"}
    response = client.post("/banned-keywords", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["keyword"] == "test_keyword"



def test_create_banned_keyword_duplicate(client):
    payload = {"keyword": "test_keyword"}
    client.post("/banned-keywords", json=payload)
    response = client.post("/banned-keywords", json=payload)
    assert response.status_code == 400


def test_update_banned_keyword_put(client):
    setup_payload = {"keyword": "test_keyword"}
    setup_resp = client.post("/banned-keywords", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    update_payload = {"keyword": "updated_keyword"}
    response = client.put(f"/banned-keywords/{pk_val}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["keyword"] == "updated_keyword"


def test_update_banned_keyword_patch(client):
    setup_payload = {"keyword": "test_keyword"}
    setup_resp = client.post("/banned-keywords", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    patch_payload = {"keyword": "patched_keyword"}
    response = client.patch(f"/banned-keywords/{pk_val}", json=patch_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["keyword"] == "patched_keyword"


def test_delete_banned_keyword(client):
    setup_payload = {"keyword": "test_keyword"}
    setup_resp = client.post("/banned-keywords", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    response = client.delete(f"/banned-keywords/{pk_val}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    verify_resp = client.get("/banned-keywords")
    assert verify_resp.json()["total"] == 0
