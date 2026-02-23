"""
LinkedIn Job Scraper - Core Functions
"""

from schemas import WebSocketSearchRequest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import JobContractType, JobType
from core import ConnectionManager
import requests
import random
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urlunparse


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

JOB_CONTRACT_CODES = {
    "full_time": "F",
    "part_time": "P",
    "internship": "I",
    "contract": "C",
    "temporary": "T",
}

JOB_TYPE_CODES = {
    "remote": 2,
    "hybrid": 3,
    "onsite": 1,
}


# ============ MAIN FUNCTIONS ============


async def search_jobs_linkedin(
    request: WebSocketSearchRequest,
    existing_ids: set = None,
    manager: ConnectionManager = None,
    client_id: str = "",
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

    while len(jobs) < request.results_wanted and start < 1000:
        # Notify: fetching page
        if manager:
            await manager.send_fetching_page(client_id, page, len(jobs))

        # Build params
        params = {
            "keywords": request.keywords,
            "location": request.location,
            "start": start,
            "pageNum": 0,
        }

        if request.distance:
            params["distance"] = request.distance
        if request.job_contract and request.job_contract in JOB_CONTRACT_CODES:
            params["f_JT"] = JOB_CONTRACT_CODES[request.job_contract]
        if request.job_type and request.job_type in JOB_TYPE_CODES:
            params["f_WT"] = JOB_TYPE_CODES[request.job_type]
        if request.easy_apply:
            params["f_AL"] = "true"
        if request.hours_old:
            params["f_TPR"] = f"r{request.hours_old * 3600}"

        # print full url
        full_url = (
            f"{BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search?"
            + "&".join([f"{k}={v}" for k, v in params.items()])
        )
        print("Full Url :", full_url)
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
                if manager:
                    await manager.send_rate_limit(client_id, wait_seconds)
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
            if manager:
                await manager.send_parsing(client_id, i + 1, len(job_cards))

            job = parse_job_card(card, session)
            if job and job["id"] not in seen_ids:
                seen_ids.add(job["id"])
                jobs.append(job)

                if len(jobs) >= request.results_wanted:
                    break

        # Delay before next page
        start += len(job_cards)
        page += 1
        if len(jobs) < request.results_wanted:
            delay = random.uniform(2, 5)
            await asyncio.sleep(delay)

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
            "job_contract": None,
            "source": "linkedin",
            "job_type": None,
        }

        # Fetch full description if session provided
        if session:
            job_details = get_job_description(session, job_id)
            job["description"] = job_details["description"]

        combined_text = " ".join(
            [
                job["description"],
                job["title"],
                job["location"],
            ]
        )

        job["job_contract"] = JobContractType.detect(combined_text)
        job["job_type"] = JobType.detect(combined_text)

        return job

    except Exception:
        return None


def get_job_description(session, job_id):
    """Fetch full job description from job detail page."""
    try:
        response = session.get(f"{BASE_URL}/jobs/view/{job_id}", timeout=5)
        if response.status_code != 200:
            return {"description": None}

        soup = BeautifulSoup(response.text, "html.parser")

        desc_div = soup.find(
            "div", class_=lambda x: x and "show-more-less-html__markup" in x
        )
        description = str(desc_div) if desc_div else None

        return {"description": description}

    except:
        return {"description": None}


def check_accuracy():
    return None


# def search_jobs(
#     keywords: str,
#     location: str = "",
#     distance: int = None,
#     job_contract: str = None,
#     is_remote: bool = False,
#     easy_apply: bool = False,
#     hours_old: int = None,
#     results_wanted: int = 25,
#     existing_ids: set = None,
# ):
#     """
#     Search LinkedIn jobs with given parameters (sync version).

#     Args:
#         keywords: Search keywords (e.g., "python developer")
#         location: Location to search (e.g., "Jakarta, Indonesia")
#         distance: Search radius in miles
#         job_contract: One of: full_time, part_time, internship, contract, temporary
#         is_remote: Filter remote jobs only
#         easy_apply: Filter Easy Apply jobs only
#         hours_old: Filter jobs posted within X hours
#         results_wanted: Number of results to fetch (max ~1000)
#         existing_ids: Set of job IDs to skip (already in database)

#     Returns:
#         List of job dictionaries
#     """
#     jobs = []
#     seen_ids = existing_ids.copy() if existing_ids else set()
#     start = 0

#     session = requests.Session()
#     session.headers.update(HEADERS)

#     while len(jobs) < results_wanted and start < 1000:
#         # Build params
#         params = {
#             "keywords": keywords,
#             "location": location,
#             "start": start,
#             "pageNum": 0,
#         }

#         if distance:
#             params["distance"] = distance
#         if job_contract and job_contract in JOB_CONTRACT_CODES:
#             params["f_JT"] = JOB_CONTRACT_CODES[job_contract]
#         if is_remote:
#             params["f_WT"] = 2
#         if easy_apply:
#             params["f_AL"] = "true"
#         if hours_old:
#             params["f_TPR"] = f"r{hours_old * 3600}"

#         # Make request
#         try:
#             response = session.get(
#                 f"{BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search",
#                 params=params,
#                 timeout=10,
#             )

#             if response.status_code == 429:
#                 time.sleep(60)
#                 continue

#             if response.status_code != 200:
#                 break

#         except Exception:
#             break

#         # Parse HTML
#         soup = BeautifulSoup(response.text, "html.parser")
#         job_cards = soup.find_all("div", class_="base-search-card")

#         if not job_cards:
#             break

#         # Extract jobs from cards
#         for card in job_cards:
#             job = parse_job_card(card, session)
#             if job and job["id"] not in seen_ids:
#                 seen_ids.add(job["id"])
#                 jobs.append(job)

#                 if len(jobs) >= results_wanted:
#                     break

#         # Delay before next page
#         start += len(job_cards)
#         if len(jobs) < results_wanted:
#             delay = random.uniform(2, 5)
#             time.sleep(delay)

#     return jobs
