"""
LinkedIn Job Scraper API
"""

from scraper import search_jobs_jobstreet
from fastapi import (
    FastAPI,
    Query,
    HTTPException,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc, func
import re

from scraper import search_jobs_linkedin
from core import engine, get_db, Base
from models import Job as JobModel
from core import manager
from schemas import StoredJobsResponse, WebSocketSearchRequest
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


@app.get("/jobs/stored", response_model=StoredJobsResponse)
def get_stored_jobs(
    search: Optional[str] = Query(
        None, description="Search in title, company, location"
    ),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    job_contract: Optional[str] = Query(None, description="Filter by job contract"),
    location: Optional[str] = Query(None, description="Filter by location"),
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

        # Get existing IDs
        existing_ids = get_existing_job_ids(db)

        # Run async scraper with progress callback
        jobs = await search_jobs_linkedin(
            request=request,
            existing_ids=existing_ids,
            manager=manager,
            client_id=client_id,
        )

        # jobs = await search_jobs_jobstreet(
        #     request=request,
        #     existing_ids=existing_ids,
        #     manager=manager,
        #     client_id=client_id,
        # )

        # Save to database
        new_count = save_jobs_to_db(db, jobs, request)
        # new_count_jobstreet = save_jobs_to_db(db, jobs_jobstreet, request)

        # Notify: completed
        await manager.send_completed(client_id, len(jobs), new_count)

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
