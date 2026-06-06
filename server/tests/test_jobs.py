from models.job import Job
from models.sessions import Sessions


def test_get_jobs_empty(client):
    response = client.get("/jobs")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["total"] == 0
    assert response.json()["data"] == []


def test_jobs_session_id_filtering(client, db_session):
    # 1. Create a session
    session_payload = {"name": "scrape_session_1", "status": "running", "total_jobs": 0}
    session_resp = client.post("/sessions", json=session_payload)
    assert session_resp.status_code == 200
    session_id = session_resp.json()["data"]["id"]

    # 2. Insert jobs directly into the db session to simulate scraped/saved jobs
    job1 = Job(
        id="job_id_1",
        title="Software Engineer",
        company="Tech Corp",
        location="Jakarta",
        job_url="https://example.com/job1",
        session_id=session_id,
    )
    job2 = Job(
        id="job_id_2",
        title="Product Manager",
        company="Biz Corp",
        location="Bandung",
        job_url="https://example.com/job2",
        session_id=None,
    )
    db_session.add(job1)
    db_session.add(job2)
    db_session.commit()

    # 3. Fetch all jobs and verify
    response = client.get("/jobs")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total"] == 2

    # 4. Fetch jobs filtered by session_id
    response_filtered = client.get(f"/jobs?session_id={session_id}")
    assert response_filtered.status_code == 200
    res_filtered_data = response_filtered.json()
    assert res_filtered_data["total"] == 1
    assert res_filtered_data["data"][0]["id"] == "job_id_1"
    assert res_filtered_data["data"][0]["session_id"] == session_id

    # 5. Fetch jobs filtered by a non-existent session_id
    response_empty = client.get("/jobs?session_id=9999")
    assert response_empty.status_code == 200
    assert response_empty.json()["total"] == 0


def test_get_stored_job(client, db_session):
    job = Job(
        id="test_job_detail_1",
        title="Details Engineer",
        company="Details Corp",
        location="Bandung",
        job_url="https://example.com/details",
        session_id=None,
    )
    db_session.add(job)
    db_session.commit()

    # Get by ID
    response = client.get("/jobs/test_job_detail_1")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["job"]["title"] == "Details Engineer"

    # Get non-existent
    response_404 = client.get("/jobs/non_existent_id")
    assert response_404.status_code == 404
