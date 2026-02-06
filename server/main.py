"""
LinkedIn Job Scraper API
"""

from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from sqlalchemy.orm import Session

from scraper import search_jobs
from database import engine, get_db, Base
from models import Job as JobModel

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


# ============ ENUMS & MODELS ============


class JobType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    internship = "internship"
    contract = "contract"
    temporary = "temporary"


class Job(BaseModel):
    id: str
    title: str
    company: str
    company_url: Optional[str] = None
    location: str
    salary: Optional[str] = None
    date_posted: Optional[str] = None
    job_url: str
    description: Optional[str] = None


class JobSearchResponse(BaseModel):
    success: bool
    count: int
    new_jobs: int  # Jobs baru yang di-scrape
    from_db: int  # Jobs yang sudah ada di database
    jobs: List[Job]


class StoredJobsResponse(BaseModel):
    success: bool
    count: int
    jobs: List[Job]


class SearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = ""
    distance: Optional[int] = None
    job_type: Optional[JobType] = None
    is_remote: Optional[bool] = False
    easy_apply: Optional[bool] = False
    hours_old: Optional[int] = None
    results_wanted: Optional[int] = 25
    fetch_description: Optional[bool] = False


# ============ HELPER FUNCTIONS ============


def save_jobs_to_db(db: Session, jobs: list, keywords: str):
    """Simpan jobs ke database, skip yang sudah ada."""
    saved_count = 0
    for job_data in jobs:
        existing = db.query(JobModel).filter(JobModel.id == job_data["id"]).first()
        if not existing:
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
                search_keywords=keywords,
            )
            db.add(db_job)
            saved_count += 1
    db.commit()
    return saved_count


def get_existing_job_ids(db: Session) -> set:
    """Ambil semua job IDs yang sudah ada di database."""
    results = db.query(JobModel.id).all()
    return {r[0] for r in results}


# ============ ROUTES ============


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "LinkedIn Job Scraper API",
        "docs": "/docs",
    }


@app.get("/jobs", response_model=JobSearchResponse)
def get_jobs(
    keywords: str = Query(..., description="Kata kunci pencarian (wajib)"),
    location: str = Query("", description="Lokasi pekerjaan"),
    distance: Optional[int] = Query(None, description="Radius pencarian (miles)"),
    job_type: Optional[JobType] = Query(None, description="Tipe pekerjaan"),
    is_remote: bool = Query(False, description="Hanya pekerjaan remote"),
    easy_apply: bool = Query(False, description="Hanya Easy Apply"),
    hours_old: Optional[int] = Query(None, description="Posted dalam X jam terakhir"),
    results_wanted: int = Query(25, ge=1, le=100, description="Jumlah hasil (max 100)"),
    fetch_description: bool = Query(False, description="Ambil deskripsi lengkap"),
    db: Session = Depends(get_db),
):
    """
    Cari lowongan kerja dari LinkedIn.
    Jobs yang sudah ada di database akan di-skip saat scraping.

    **Contoh:**
    - `/jobs?keywords=python developer&location=Jakarta`
    - `/jobs?keywords=frontend&is_remote=true&job_type=full_time`
    """
    try:
        # Get existing job IDs from database
        existing_ids = get_existing_job_ids(db)

        # Scrape jobs
        jobs = search_jobs(
            keywords=keywords,
            location=location,
            distance=distance,
            job_type=job_type.value if job_type else None,
            is_remote=is_remote,
            easy_apply=easy_apply,
            hours_old=hours_old,
            results_wanted=results_wanted,
            fetch_description=fetch_description,
            existing_ids=existing_ids,
        )

        # Save new jobs to database
        new_count = save_jobs_to_db(db, jobs, keywords)

        return JobSearchResponse(
            success=True,
            count=len(jobs),
            new_jobs=new_count,
            from_db=len(jobs) - new_count,
            jobs=jobs,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/jobs/search", response_model=JobSearchResponse)
def search_jobs_post(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Cari lowongan kerja dengan POST request.
    Berguna untuk request yang lebih kompleks.
    """
    try:
        existing_ids = get_existing_job_ids(db)

        jobs = search_jobs(
            keywords=request.keywords,
            location=request.location,
            distance=request.distance,
            job_type=request.job_type.value if request.job_type else None,
            is_remote=request.is_remote,
            easy_apply=request.easy_apply,
            hours_old=request.hours_old,
            results_wanted=request.results_wanted,
            fetch_description=request.fetch_description,
            existing_ids=existing_ids,
        )

        new_count = save_jobs_to_db(db, jobs, request.keywords)

        return JobSearchResponse(
            success=True,
            count=len(jobs),
            new_jobs=new_count,
            from_db=len(jobs) - new_count,
            jobs=jobs,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ STORED JOBS ROUTES ============


@app.get("/jobs/stored", response_model=StoredJobsResponse)
def get_stored_jobs(
    keywords: Optional[str] = Query(None, description="Filter by search keywords"),
    skip: int = Query(0, ge=0, description="Skip N results"),
    limit: int = Query(100, ge=1, le=500, description="Limit results"),
    db: Session = Depends(get_db),
):
    """Ambil semua jobs yang tersimpan di database."""
    query = db.query(JobModel)

    if keywords:
        query = query.filter(JobModel.search_keywords.contains(keywords))

    jobs = query.offset(skip).limit(limit).all()

    return StoredJobsResponse(
        success=True,
        count=len(jobs),
        jobs=[job.to_dict() for job in jobs],
    )


@app.get("/jobs/stored/{job_id}")
def get_stored_job(job_id: str, db: Session = Depends(get_db)):
    """Ambil detail job tertentu dari database."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"success": True, "job": job.to_dict()}


@app.delete("/jobs/stored")
def delete_all_stored_jobs(db: Session = Depends(get_db)):
    """Hapus semua jobs dari database."""
    count = db.query(JobModel).delete()
    db.commit()

    return {"success": True, "deleted": count}


@app.delete("/jobs/stored/{job_id}")
def delete_stored_job(job_id: str, db: Session = Depends(get_db)):
    """Hapus job tertentu dari database."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {"success": True, "deleted_id": job_id}


# ============ RUN ============

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
