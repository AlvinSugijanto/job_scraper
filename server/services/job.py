"""
Service layer for jobs — business logic.
"""

import logging

from sqlalchemy.orm import Session
from fastapi import HTTPException
from schemas import JobsResponse
from repositories import job as job_repo
from repositories import banned_company as banned_company_repo
from repositories import banned_keyword as banned_keyword_repo

logger = logging.getLogger(__name__)


def get_jobs(
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
    """Get paginated stored jobs."""
    logger.info(
        f"Fetching stored jobs - search: '{search}', type: '{job_type}', "
        f"contract: '{job_contract}', location: '{location}', source: '{source}'"
    )

    jobs, total = job_repo.get(
        db,
        search=search,
        job_type=job_type,
        job_contract=job_contract,
        location=location,
        source=source,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )

    return JobsResponse(
        success=True,
        count=len(jobs),
        total=total,
        jobs=[job.to_dict() for job in jobs],
    )


def get_job(db: Session, job_id: str):
    """Get a single job by ID. Raises HTTPException if not found."""
    job = job_repo.find(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"success": True, "job": job.to_dict()}


def save_scraped_jobs(db: Session, jobs: list, keywords: str) -> int:
    """Save scraped jobs to DB, filtering out banned companies and keywords."""

    saved_count = 0
    for job_data in jobs:
        job_repo.create(db, job_data, search_keywords=keywords)
        saved_count += 1

    job_repo.commit(db)
    return saved_count


def get_existing_ids(db: Session) -> set:
    """Get all existing job IDs."""
    return job_repo.get_all_ids(db)
