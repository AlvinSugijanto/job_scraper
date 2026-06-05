"""
Repository for jobs — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc, func
from models import Job as JobModel
import re


def getAll(db: Session) -> list:
    """Get all jobs."""
    return db.query(JobModel).all()


def get(
    db: Session,
    search: str = None,
    job_type: str = None,
    job_contract: str = None,
    location: str = None,
    source: str = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 25,
):
    """Get jobs with filters, sort, and pagination."""
    query = db.query(JobModel)

    if search:
        normalized = re.sub(r"[-_\s]+", "", search.lower())

        search_filter = or_(
            JobModel.title.ilike(f"%{search}%"),
            JobModel.company.ilike(f"%{search}%"),
            JobModel.location.ilike(f"%{search}%"),
            func.replace(
                func.replace(func.lower(JobModel.title), "-", ""), " ", ""
            ).ilike(f"%{normalized}%"),
            func.replace(
                func.replace(func.lower(JobModel.company), "-", ""), " ", ""
            ).ilike(f"%{normalized}%"),
        )
        query = query.filter(search_filter)

    if job_type:
        query = query.filter(JobModel.job_type == job_type)

    if job_contract:
        query = query.filter(JobModel.job_contract == job_contract)

    if location:
        query = query.filter(JobModel.location.ilike(f"%{location}%"))

    if source:
        query = query.filter(JobModel.source == source)

    total = query.count()

    sort_column_map = {
        "title": JobModel.title,
        "company": JobModel.company,
        "location": JobModel.location,
        "salary": JobModel.salary,
        "date_posted": JobModel.date_posted,
        "created_at": JobModel.created_at,
    }
    sort_column = sort_column_map.get(sort_by, JobModel.created_at)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    jobs = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return jobs, total


def find(db: Session, job_id: str):
    """Find a single job by ID."""
    return db.query(JobModel).filter(JobModel.id == job_id).first()


def create(db: Session, job_data: dict, search_keywords: str = None):
    """Create a new job record."""
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
        search_keywords=search_keywords,
        source=job_data.get("source"),
    )
    db.add(db_job)
    return db_job


def get_all_ids(db: Session) -> set:
    """Get all existing job IDs."""
    results = db.query(JobModel.id).all()
    return {r[0] for r in results}


def commit(db: Session):
    """Commit the current transaction."""
    db.commit()
