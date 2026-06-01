"""
LinkedIn Job Scraper API
"""

import logging
from logging.handlers import RotatingFileHandler

# Configure logging to console and scraper.log file with precise date/time
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s",
    handlers=[
        RotatingFileHandler("scraper.log", maxBytes=10*1024*1024, backupCount=3, encoding="utf-8"),
        logging.StreamHandler()
    ],
    force=True
)
logger = logging.getLogger(__name__)
logger.info("LinkedIn Job Scraper API starting up...")


from scraper import search_jobs_kalibrr
from scraper import search_jobs_jobstreet
from fastapi import (
    FastAPI,
    Query,
    HTTPException,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc, func
import asyncio
import re

from scraper import search_jobs_linkedin
from core import engine, get_db, Base
from models import Job as JobModel
from core import manager
from schemas import StoredJobsResponse, WebSocketSearchRequest, JobSearchResponse
from repositories import save_jobs_to_db, get_existing_job_ids

# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LinkedIn Job Scraper API",
    description="API untuk mencari lowongan kerja dari LinkedIn",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ ROUTES ============


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "LinkedIn Job Scraper API",
        "docs": "/docs",
    }


async def run_background_scrape(request: WebSocketSearchRequest):
    """
    Background task helper to perform scraping and database update concurrently.
    Creates and closes its own db session to avoid thread-safety and lifespan issues.
    """
    from core.database import SessionLocal
    import logging

    logger = logging.getLogger("background_scraper")
    logger.info(f"Starting background scraping for keywords: '{request.keywords}'")
    
    db = SessionLocal()
    try:
        # Get existing IDs
        existing_ids = get_existing_job_ids(db)

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
        new_count = save_jobs_to_db(db, all_jobs, request)
        logger.info(f"Background scraping completed. Found {len(all_jobs)} total jobs, {new_count} new jobs saved.")
    except Exception as e:
        logger.error(f"Error during background scraping execution: {str(e)}")
    finally:
        db.close()


@app.post("/jobs/scrape")
async def scrape_jobs(
    request: WebSocketSearchRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger scraping lowongan kerja di background secara non-blocking.
    Mengembalikan respons segera tanpa menunggu proses scraping selesai.
    """
    logger.info(f"Triggered scraping via API for keywords: '{request.keywords}' on portals: {request.job_portals}")
    background_tasks.add_task(run_background_scrape, request)
    return {
        "success": True,
        "status": "processing",
        "message": f"Scraping task for '{request.keywords}' has been started in the background.",
        "portals": request.job_portals,
    }



@app.get("/jobs/stored", response_model=StoredJobsResponse)
def get_stored_jobs(
    search: Optional[str] = Query(
        None, description="Search in title, company, location"
    ),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    job_contract: Optional[str] = Query(None, description="Filter by job contract"),
    location: Optional[str] = Query(None, description="Filter by location"),
    source: Optional[str] = Query(None, description="Filter by source"),
    sort_by: Optional[str] = Query(
        "created_at",
        description="Sort by field: title, company, location, salary, date_posted, created_at",
    ),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    skip: int = Query(0, ge=0, description="Skip N results"),
    limit: int = Query(25, ge=1, le=10000, description="Limit results"),
    db: Session = Depends(get_db),
):
    """Ambil semua jobs yang tersimpan di database."""
    logger.info(f"API Fetching stored jobs - search: '{search}', type: '{job_type}', contract: '{job_contract}', location: '{location}', source: '{source}'")
    query = db.query(JobModel)

    if search:
        # Normalize search: remove special chars
        # e.g., "backend" should match "Back-end", "back end", "backend"
        normalized = re.sub(r"[-_\s]+", "", search.lower())

        # Search with multiple patterns using OR
        search_filter = or_(
            # Original search
            JobModel.title.ilike(f"%{search}%"),
            JobModel.company.ilike(f"%{search}%"),
            JobModel.location.ilike(f"%{search}%"),
            # Normalized (no special chars) - matches "backend" to "Back-end Developer"
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

    # Get total count before pagination
    total = query.count()

    # Apply sorting
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

    # Apply pagination and sorting
    jobs = query.order_by(order_func(sort_column)).offset(skip).limit(limit).all()

    return StoredJobsResponse(
        success=True,
        count=len(jobs),
        total=total,
        jobs=[job.to_dict() for job in jobs],
    )


@app.get("/jobs/stored/{job_id}")
def get_stored_job(job_id: str, db: Session = Depends(get_db)):
    """Ambil detail job tertentu dari database."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"success": True, "job": job.to_dict()}


# ============ WEBSOCKET ROUTES ============


@app.websocket("/ws/scrape/{client_id}")
async def websocket_scrape(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time scraping progress.

    Client sends search params, server streams progress updates.
    """
    await manager.connect(client_id, websocket)

    # Get database session
    db = next(get_db())

    try:
        # Wait for search request from client
        data = await websocket.receive_json()
        request = WebSocketSearchRequest(**data)

        # Notify: started
        await manager.send_started(client_id, f"Searching for '{request.keywords}'...")

        # Background task to listen for cancellation from client
        async def listen_for_cancel():
            try:
                while True:
                    msg = await websocket.receive_json()
                    if msg.get("action") == "cancel":
                        manager.cancel(client_id)
                        break
            except Exception:
                manager.cancel(client_id)

        cancel_task = asyncio.create_task(listen_for_cancel())

        # Get existing IDs
        existing_ids = get_existing_job_ids(db)

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

        # Run selected scrapers concurrently
        tasks = [
            portal_scrapers[portal](
                request=request,
                existing_ids=existing_ids,
                manager=manager,
                client_id=client_id,
            )
            for portal in portals
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        # Stop listening for cancel
        cancel_task.cancel()

        # Merge results, skip any that errored
        all_jobs = []
        for result in results:
            if isinstance(result, Exception):
                await manager.send_error(client_id, str(result))
            else:
                all_jobs.extend(result)

        # Save to database
        new_count = save_jobs_to_db(db, all_jobs, request)

        # Notify: completed
        await manager.send_completed(client_id, len(all_jobs), new_count)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await manager.send_error(client_id, str(e))
    finally:
        manager.disconnect(client_id)
        db.close()


# ============ RUN ============

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
