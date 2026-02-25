"""
Scraper package - LinkedIn job scraper
"""

from .jobstreet_scraper import search_jobs_jobstreet
from .linkedin_scraper import search_jobs_linkedin

__all__ = ["search_jobs_jobstreet", "search_jobs_linkedin"]
