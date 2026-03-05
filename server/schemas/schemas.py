"""
Pydantic Schemas / Request & Response Models
"""

from .enums import JobContractType, JobType
from pydantic import BaseModel
from typing import Optional, List


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
    created_at: Optional[str] = None
    job_type: Optional[JobType] = None
    job_contract: Optional[JobContractType] = None
    source: Optional[str] = None


class JobSearchResponse(BaseModel):
    success: bool
    count: int
    new_jobs: int  # Jobs baru yang di-scrape
    from_db: int  # Jobs yang sudah ada di database
    jobs: List[Job]


class StoredJobsResponse(BaseModel):
    success: bool
    count: int
    total: int  # Total count for pagination
    jobs: List[Job]


class SearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = ""
    distance: Optional[int] = None
    job_contract: Optional[JobContractType] = None
    job_type: Optional[JobType] = None
    easy_apply: Optional[bool] = False
    hours_old: Optional[int] = None
    results_wanted: Optional[int] = 25


class WebSocketSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = ""
    distance: Optional[int] = None
    job_contract: Optional[JobContractType] = None
    job_type: Optional[JobType] = None
    easy_apply: Optional[bool] = False
    hours_old: Optional[int] = None
    results_wanted: Optional[int] = 25
    job_portals: Optional[List[str]] = ["linkedin", "jobstreet", "kalibrr"]
