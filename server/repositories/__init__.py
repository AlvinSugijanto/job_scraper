"""
Repositories package - LinkedIn job scraper
"""

from .job_repositories import save_jobs_to_db, get_existing_job_ids

__all__ = ["save_jobs_to_db", "get_existing_job_ids"]
