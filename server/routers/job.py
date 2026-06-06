"""Job routes."""

import logging
import asyncio

from fastapi import APIRouter, Query, Depends, BackgroundTasks
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import WebSocketSearchRequest
from services import job as job_service
from scraper import search_jobs_linkedin, search_jobs_jobstreet, search_jobs_kalibrr

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


async def run_background_scrape(request: WebSocketSearchRequest):
    """
    Background task helper to perform scraping and database update concurrently.
    Creates and closes its own db session to avoid thread-safety and lifespan issues.
    """
    from core.database import SessionLocal

    logger.info(f"Starting background scraping for keywords: '{request.keywords}'")

    db = SessionLocal()
    try:
        # Get existing IDs
        existing_ids = job_service.get_existing_ids(db)

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
        new_count = job_service.save_scraped_jobs(
            db, all_jobs, request.keywords, session_id=request.session_id
        )
        logger.info(
            f"Background scraping completed. Found {len(all_jobs)} total jobs, {new_count} new jobs saved."
        )
    except Exception as e:
        logger.error(f"Error during background scraping execution: {str(e)}")
    finally:
        db.close()


@router.post("/scrape")
async def scrape_jobs(
    request: WebSocketSearchRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger scraping lowongan kerja di background secara non-blocking.
    Mengembalikan respons segera tanpa menunggu proses scraping selesai.
    """
    logger.info(
        f"Triggered scraping via API for keywords: '{request.keywords}' on portals: {request.job_portals}"
    )
    background_tasks.add_task(run_background_scrape, request)
    return {
        "success": True,
        "status": "processing",
        "message": f"Scraping task for '{request.keywords}' has been started in the background.",
        "portals": request.job_portals,
    }


@router.get("/")
def get_stored_jobs(
    search: Optional[str] = Query(
        None, description="Search in title, company, location"
    ),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    job_contract: Optional[str] = Query(None, description="Filter by job contract"),
    location: Optional[str] = Query(None, description="Filter by location"),
    source: Optional[str] = Query(None, description="Filter by source"),
    session_id: Optional[int] = Query(None, description="Filter by session ID"),
    sort_by: Optional[str] = Query(
        "created_at",
        description="Sort by field: title, company, location, salary, date_posted, created_at",
    ),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        25, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    """Ambil semua jobs yang tersimpan di database."""
    return job_service.get_jobs(
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


@router.get("/{id}")
def get_stored_job(id: str, db: Session = Depends(get_db)):
    """Ambil detail job tertentu dari database."""
    return job_service.get_job(db, id)
