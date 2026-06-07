"""
Service layer for jobs — business logic.
"""

import logging
import asyncio

from sqlalchemy.orm import Session
from fastapi import HTTPException
from schemas import JobsResponse, WebSocketSearchRequest
from repositories import job as job_repo
from repositories import banned_company as banned_company_repo
from repositories import banned_keyword as banned_keyword_repo
from scraper import search_jobs_linkedin, search_jobs_jobstreet, search_jobs_kalibrr

logger = logging.getLogger(__name__)


def get_jobs(
    db: Session,
    search: str = None,
    job_type: str = None,
    job_contract: str = None,
    location: str = None,
    source: str = None,
    session_id: int = None,
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
        session_id=session_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )

    return JobsResponse(
        success=True,
        count=len(jobs),
        total=total,
        data=[job.to_dict() for job in jobs],
    )


def get_job(db: Session, job_id: str):
    """Get a single job by ID. Raises HTTPException if not found."""
    job = job_repo.find(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"success": True, "job": job.to_dict()}


def save_scraped_jobs(
    db: Session, jobs: list, keywords: str, session_id: int = None
) -> int:
    """Save scraped jobs to DB, filtering out banned companies and keywords."""

    saved_count = 0
    for job_data in jobs:
        if session_id is not None:
            job_data["session_id"] = session_id
        job_repo.create(db, job_data, search_keywords=keywords)
        saved_count += 1

    job_repo.commit(db)
    return saved_count


def get_existing_ids(db: Session) -> set:
    """Get all existing job IDs."""
    return job_repo.get_all_ids(db)


async def run_background_scrape(request: WebSocketSearchRequest):
    """
    Background task helper to perform scraping and database update concurrently.
    Creates and closes its own db session to avoid thread-safety and lifespan issues.
    """
    from core.database import SessionLocal
    from repositories import sessions as sessions_repo
    from datetime import datetime

    logger.info(f"Starting background scraping for keywords: '{request.keywords}'")

    db = SessionLocal()
    try:
        # Update session status to running
        if request.session_id is not None:
            sessions_repo.update(
                db,
                request.session_id,
                {
                    "status": "running",
                    "start_run_time": datetime.utcnow(),
                },
            )

        # Get existing IDs
        existing_ids = get_existing_ids(db)

        # Map portal key → scraper function
        portal_scrapers = {
            "linkedin": search_jobs_linkedin,
            "jobstreet": search_jobs_jobstreet,
            "kalibrr": search_jobs_kalibrr,
        }

        # Filter only valid & selected portals
        portals = [p for p in (request.job_portals or []) if p in portal_scrapers]
        if not portals:
            portals = ["linkedin"]  # fallback

        # Run selected scrapers concurrently without a WebSocket manager
        tasks = [
            portal_scrapers[portal](
                request=request,
                existing_ids=existing_ids,
            )
            for portal in portals
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge results, skip any that errored
        all_jobs = []
        for portal, result in zip(portals, results):
            if isinstance(result, Exception):
                logger.error(f"Error in background scraper for {portal}: {str(result)}")
            elif result:
                all_jobs.extend(result)

        # Save new jobs to database
        new_count = save_scraped_jobs(
            db, all_jobs, request.keywords, session_id=request.session_id
        )
        logger.info(
            f"Background scraping completed. Found {len(all_jobs)} total jobs, {new_count} new jobs saved."
        )

        # Update session status to success
        if request.session_id is not None:
            sessions_repo.update(
                db,
                request.session_id,
                {
                    "status": "success",
                    "end_run_time": datetime.utcnow(),
                    "total_jobs": len(all_jobs),
                },
            )
    except Exception as e:
        logger.error(f"Error during background scraping execution: {str(e)}")
        if request.session_id is not None:
            try:
                db.rollback()
                sessions_repo.update(
                    db,
                    request.session_id,
                    {
                        "status": "failed",
                        "end_run_time": datetime.utcnow(),
                    },
                )
            except Exception as update_err:
                logger.error(f"Failed to update session status to failed: {update_err}")
    finally:
        db.close()

