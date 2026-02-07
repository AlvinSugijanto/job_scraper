"""
LinkedIn Job Scraper - Core Functions
"""

import requests
import time
import random
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urlunparse
from typing import Callable, Optional


# ============ CONFIG ============
BASE_URL = "https://www.linkedin.com"
HEADERS = {
    "authority": "www.linkedin.com",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

JOB_TYPE_CODES = {
    "full_time": "F",
    "part_time": "P",
    "internship": "I",
    "contract": "C",
    "temporary": "T",
}


# ============ MAIN FUNCTIONS ============


async def search_jobs_async(
    keywords: str,
    location: str = "",
    distance: int = None,
    job_type: str = None,
    is_remote: bool = False,
    easy_apply: bool = False,
    hours_old: int = None,
    results_wanted: int = 25,
    existing_ids: set = None,
    on_progress: Optional[Callable] = None,
):
    """
    Async version of search_jobs with progress callback support.

    Args:
        on_progress: Async callback function(event_type, data)
                    event_type: 'fetching_page', 'rate_limit', 'parsing', 'job_found'
    """
    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    start = 0
    page = 1

    session = requests.Session()
    session.headers.update(HEADERS)

    while len(jobs) < results_wanted and start < 1000:
        # Notify: fetching page
        if on_progress:
            await on_progress("fetching_page", {"page": page, "jobs_found": len(jobs)})

        # Build params
        params = {
            "keywords": keywords,
            "location": location,
            "start": start,
            "pageNum": 0,
        }

        if distance:
            params["distance"] = distance
        if job_type and job_type in JOB_TYPE_CODES:
            params["f_JT"] = JOB_TYPE_CODES[job_type]
        if is_remote:
            params["f_WT"] = 2
        if easy_apply:
            params["f_AL"] = "true"
        if hours_old:
            params["f_TPR"] = f"r{hours_old * 3600}"

        # Make request
        try:
            response = session.get(
                f"{BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search",
                params=params,
                timeout=10,
            )

            if response.status_code == 429:
                # Rate limited - notify client
                wait_seconds = 60
                if on_progress:
                    await on_progress("rate_limit", {"wait_seconds": wait_seconds})
                await asyncio.sleep(wait_seconds)
                continue

            if response.status_code != 200:
                break

        except Exception:
            break

        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = soup.find_all("div", class_="base-search-card")

        if not job_cards:
            break

        # Extract jobs from cards
        for i, card in enumerate(job_cards):
            if on_progress:
                await on_progress(
                    "parsing", {"current": i + 1, "total": len(job_cards)}
                )

            job = parse_job_card(card, session)
            if job and job["id"] not in seen_ids:
                seen_ids.add(job["id"])
                jobs.append(job)

                if len(jobs) >= results_wanted:
                    break

        # Delay before next page
        start += len(job_cards)
        page += 1
        if len(jobs) < results_wanted:
            delay = random.uniform(2, 5)
            await asyncio.sleep(delay)

    return jobs


def search_jobs(
    keywords: str,
    location: str = "",
    distance: int = None,
    job_type: str = None,
    is_remote: bool = False,
    easy_apply: bool = False,
    hours_old: int = None,
    results_wanted: int = 25,
    existing_ids: set = None,
):
    """
    Search LinkedIn jobs with given parameters (sync version).

    Args:
        keywords: Search keywords (e.g., "python developer")
        location: Location to search (e.g., "Jakarta, Indonesia")
        distance: Search radius in miles
        job_type: One of: full_time, part_time, internship, contract, temporary
        is_remote: Filter remote jobs only
        easy_apply: Filter Easy Apply jobs only
        hours_old: Filter jobs posted within X hours
        results_wanted: Number of results to fetch (max ~1000)
        existing_ids: Set of job IDs to skip (already in database)

    Returns:
        List of job dictionaries
    """
    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    start = 0

    session = requests.Session()
    session.headers.update(HEADERS)

    while len(jobs) < results_wanted and start < 1000:
        # Build params
        params = {
            "keywords": keywords,
            "location": location,
            "start": start,
            "pageNum": 0,
        }

        if distance:
            params["distance"] = distance
        if job_type and job_type in JOB_TYPE_CODES:
            params["f_JT"] = JOB_TYPE_CODES[job_type]
        if is_remote:
            params["f_WT"] = 2
        if easy_apply:
            params["f_AL"] = "true"
        if hours_old:
            params["f_TPR"] = f"r{hours_old * 3600}"

        # Make request
        try:
            response = session.get(
                f"{BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search",
                params=params,
                timeout=10,
            )

            if response.status_code == 429:
                time.sleep(60)
                continue

            if response.status_code != 200:
                break

        except Exception:
            break

        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = soup.find_all("div", class_="base-search-card")

        if not job_cards:
            break

        # Extract jobs from cards
        for card in job_cards:
            job = parse_job_card(card, session)
            if job and job["id"] not in seen_ids:
                seen_ids.add(job["id"])
                jobs.append(job)

                if len(jobs) >= results_wanted:
                    break

        # Delay before next page
        start += len(job_cards)
        if len(jobs) < results_wanted:
            delay = random.uniform(2, 5)
            time.sleep(delay)

    return jobs


def parse_job_card(card, session=None):
    """Parse a single job card HTML element."""
    try:
        # Get job URL and ID
        link = card.find("a", class_="base-card__full-link")
        if not link or "href" not in link.attrs:
            return None

        href = link["href"].split("?")[0]
        job_id = href.split("-")[-1]

        # Title
        title_tag = card.find("span", class_="sr-only")
        title = title_tag.get_text(strip=True) if title_tag else "N/A"

        # Company
        company_tag = card.find("h4", class_="base-search-card__subtitle")
        company_link = company_tag.find("a") if company_tag else None
        company = company_link.get_text(strip=True) if company_link else "N/A"
        company_url = ""
        if company_link and company_link.has_attr("href"):
            company_url = urlunparse(urlparse(company_link["href"])._replace(query=""))

        # Location
        location_tag = card.find("span", class_="job-search-card__location")
        location = location_tag.get_text(strip=True) if location_tag else "N/A"

        # Salary (if available)
        salary_tag = card.find("span", class_="job-search-card__salary-info")
        salary = salary_tag.get_text(strip=True) if salary_tag else None

        # Date posted
        date_tag = card.find("time", class_="job-search-card__listdate")
        date_posted = None
        if date_tag and "datetime" in date_tag.attrs:
            try:
                date_posted = datetime.strptime(date_tag["datetime"], "%Y-%m-%d")
            except:
                pass

        job = {
            "id": job_id,
            "title": title,
            "company": company,
            "company_url": company_url,
            "location": location,
            "salary": salary,
            "date_posted": date_posted.strftime("%Y-%m-%d") if date_posted else None,
            "job_url": f"{BASE_URL}/jobs/view/{job_id}",
            "description": None,
            "work_type": None,
        }

        # Fetch full description and work type if session provided
        if session:
            job_details = get_job_description(session, job_id)
            job["description"] = job_details["description"]
            job["work_type"] = job_details["work_type"]

        return job

    except Exception:
        return None


def get_job_description(session, job_id):
    """Fetch full job description and work type from job detail page."""
    try:
        response = session.get(f"{BASE_URL}/jobs/view/{job_id}", timeout=5)
        if response.status_code != 200:
            return {"description": None, "work_type": None}

        soup = BeautifulSoup(response.text, "html.parser")

        # Get description
        desc_div = soup.find(
            "div", class_=lambda x: x and "show-more-less-html__markup" in x
        )
        description = str(desc_div) if desc_div else None

        # Get work type from fit-level-preferences buttons
        work_type = None
        fit_level_div = soup.find("div", class_="job-details-fit-level-preferences")
        if fit_level_div:
            buttons = fit_level_div.find_all("button")
            for button in buttons:
                button_text = button.get_text(strip=True).lower()
                if "remote" in button_text:
                    work_type = "remote"
                    break
                elif "hybrid" in button_text:
                    work_type = "hybrid"
                    break

        return {"description": description, "work_type": work_type}

    except:
        return {"description": None, "work_type": None}
