"""Job routes."""

import logging

from fastapi import APIRouter, Query, Depends, BackgroundTasks
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import WebSocketSearchRequest
from services import job as job_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


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
    background_tasks.add_task(job_service.run_background_scrape, request)
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
