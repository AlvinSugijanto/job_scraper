"""
Schemas package - LinkedIn job scraper
"""

from .job import (
    Job,
    JobsResponse,
    WebSocketSearchRequest,
)

from .banned_company import BannedCompanyCreate
from .banned_keyword import BannedKeywordCreate


__all__ = [
    "Job",
    "JobsResponse",
    "WebSocketSearchRequest",
    "BannedCompanyCreate",
    "BannedKeywordCreate",
]
