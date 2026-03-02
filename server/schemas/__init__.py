"""
Schemas package - LinkedIn job scraper
"""

from .schemas import (
    Job,
    JobSearchResponse,
    StoredJobsResponse,
    SearchRequest,
    WebSocketSearchRequest,
)

from .enums import (
    JobType,
    JobContractType,
)

__all__ = [
    "Job",
    "JobSearchResponse",
    "StoredJobsResponse",
    "SearchRequest",
    "WebSocketSearchRequest",
    "JobType",
    "JobContractType",
]
