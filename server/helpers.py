"""
DB Helper Functions
"""

from sqlalchemy.orm import Session
from models import Job as JobModel, detect_job_type
from schemas import WebSocketSearchRequest


def save_jobs_to_db(db: Session, jobs: list, request: WebSocketSearchRequest) -> int:
    """Simpan jobs ke database, skip yang sudah ada."""
    saved_count = 0
    for job_data in jobs:
        existing = db.query(JobModel).filter(JobModel.id == job_data["id"]).first()
        if not existing:
            # Detect work arrangement (remote/hybrid/onsite) from text
            combined_text = " ".join(
                [
                    job_data.get("description", "") or "",
                    job_data.get("title", "") or "",
                    job_data.get("location", "") or "",
                ]
            )
            job_type = detect_job_type(combined_text)

            db_job = JobModel(
                id=job_data["id"],
                title=job_data["title"],
                company=job_data["company"],
                company_url=job_data.get("company_url"),
                location=job_data["location"],
                salary=job_data.get("salary"),
                date_posted=job_data.get("date_posted"),
                job_url=job_data["job_url"],
                description=job_data.get("description"),
                job_type=job_type,
                job_contract=request.job_contract,
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
