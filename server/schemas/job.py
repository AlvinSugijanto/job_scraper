"""
Pydantic Schemas for Jobs.
"""

from enums import JobContractType, JobType
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


class JobsResponse(BaseModel):
    success: bool
    count: int
    total: int  # Total count for pagination
    jobs: List[Job]


class WebSocketSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = ""
    distance: Optional[int] = None
    job_contract: Optional[JobContractType] = None
    job_type: Optional[JobType] = None
    easy_apply: Optional[bool] = True
    hours_old: Optional[int] = None
    results_wanted: Optional[int] = 25
    job_portals: Optional[List[str]] = ["linkedin", "jobstreet", "kalibrr"]
