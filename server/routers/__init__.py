"""Routers package."""

from .job import router as job_router
from .banned_companies import router as banned_companies_router
from .banned_keywords import router as banned_keywords_router

__all__ = ["job_router", "banned_companies_router", "banned_keywords_router"]
