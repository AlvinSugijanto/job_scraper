"""
Schemas package - LinkedIn job scraper
"""

from .job import (
    Job,
    JobsResponse,
    WebSocketSearchRequest,
)



from .banned_company import BannedCompanyCreate, BannedCompanyUpdate
from .banned_keyword import BannedKeywordCreate, BannedKeywordUpdate
from .sessions import SessionsCreate, SessionsUpdate
__all__ = [
    "Job",
    "JobsResponse",
    "WebSocketSearchRequest",
    "BannedCompanyCreate",
    "BannedKeywordCreate",
    "SessionsCreate",
]
