"""
DB Helper Functions
"""

from sqlalchemy.orm import Session
from models import Job as JobModel
from schemas import WebSocketSearchRequest


def save_jobs_to_db(db: Session, jobs: list, request: WebSocketSearchRequest) -> int:
    """Simpan jobs ke database, skip yang sudah ada."""
    saved_count = 0
    for job_data in jobs:
        db_job = JobModel(
            id=job_data.get("id"),
            title=job_data.get("title"),
            company=job_data.get("company"),
            company_url=job_data.get("company_url"),
            location=job_data.get("location"),
            salary=job_data.get("salary"),
            date_posted=job_data.get("date_posted"),
            job_url=job_data.get("job_url"),
            description=job_data.get("description"),
            job_type=job_data.get("job_type"),
            job_contract=job_data.get("job_contract"),
            search_keywords=request.keywords,
            source=job_data.get("source"),
        )
        db.add(db_job)
        saved_count += 1
    db.commit()
    return saved_count


def get_existing_job_ids(db: Session) -> set:
    """Ambil semua job IDs yang sudah ada di database."""
    results = db.query(JobModel.id).all()
    return {r[0] for r in results}
