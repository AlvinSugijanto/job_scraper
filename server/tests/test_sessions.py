def test_get_sessions_empty(client):
    response = client.get("/sessions")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["total"] == 0
    assert response.json()["data"] == []


def test_create_sessions(client):
    payload = {"name": "test_name", "status": "test_status", "total_jobs": 42, "start_run_time": None, "end_run_time": None}
    response = client.post("/sessions", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["name"] == "test_name"
    assert data["status"] == "test_status"
    assert data["total_jobs"] == 42



def test_create_sessions_duplicate(client):
    payload = {"name": "test_name", "status": "test_status", "total_jobs": 42, "start_run_time": None, "end_run_time": None}
    client.post("/sessions", json=payload)
    response = client.post("/sessions", json=payload)
    assert response.status_code == 400


def test_update_sessions_put(client):
    setup_payload = {"name": "test_name", "status": "test_status", "total_jobs": 42, "start_run_time": None, "end_run_time": None}
    setup_resp = client.post("/sessions", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    update_payload = {"name": "updated_name", "status": "updated_status", "total_jobs": 100, "start_run_time": None, "end_run_time": None}
    response = client.put(f"/sessions/{pk_val}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["name"] == "updated_name"
    assert data["status"] == "updated_status"
    assert data["total_jobs"] == 100


def test_update_sessions_patch(client):
    setup_payload = {"name": "test_name", "status": "test_status", "total_jobs": 42, "start_run_time": None, "end_run_time": None}
    setup_resp = client.post("/sessions", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    patch_payload = {"name": "patched_name", "status": "patched_status", "total_jobs": 50, "start_run_time": None, "end_run_time": None}
    response = client.patch(f"/sessions/{pk_val}", json=patch_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    data = response.json()["data"]
    assert data["name"] == "patched_name"
    assert data["status"] == "patched_status"
    assert data["total_jobs"] == 50


def test_delete_sessions(client):
    setup_payload = {"name": "test_name", "status": "test_status", "total_jobs": 42, "start_run_time": None, "end_run_time": None}
    setup_resp = client.post("/sessions", json=setup_payload)
    pk_val = setup_resp.json()["data"]["id"]

    response = client.delete(f"/sessions/{pk_val}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    verify_resp = client.get("/sessions")
    assert verify_resp.json()["total"] == 0
