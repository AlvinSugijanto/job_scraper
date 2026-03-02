"""
JobStreet Job Scraper - Core Functions
"""

from schemas import WebSocketSearchRequest, JobContractType, JobType
from core import ConnectionManager
import requests
import random
import asyncio
import json
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urljoin
import re


# ============ CONFIG ============
BASE_URL = "https://id.jobstreet.com"

HEADERS = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9,id;q=0.8",
    "cache-control": "max-age=0",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

JOB_CONTRACT_CODES = {
    "full_time": "242",
    "part_time": "243",
    "contract": "244",
    "temporary": "244",
    "internship": "245",
}

JOB_TYPE_CODES = {
    "onsite": "1",
    "hybrid": "2",
    "remote": "3",
}

DATE_RANGE_MAP = {
    1: "1",
    3: "3",
    7: "7",
    14: "14",
    30: "31",
}


# ============ MAIN FUNCTIONS ============


async def search_jobs_jobstreet(
    request: WebSocketSearchRequest,
    existing_ids: set = None,
    manager: ConnectionManager = None,
    client_id: str = "",
):
    """
    Async search for JobStreet jobs with progress callback support.

    Args:
        on_progress: Async callback function(event_type, data)
                    event_type: 'fetching_page', 'rate_limit', 'parsing', 'job_found'
    """
    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    page = 1

    session = requests.Session()
    session.headers.update(HEADERS)

    while len(jobs) < request.results_wanted and page <= 20:
        # Notify: fetching page
        if manager:
            await manager.send_fetching_page(client_id, page, len(jobs))

        # Build URL
        keyword_slug = request.keywords.lower().replace(" ", "-")
        url = f"{BASE_URL}/id/{quote_plus(keyword_slug)}-jobs"

        # Build params
        params = {"page": page}

        if request.job_contract and request.job_contract in JOB_CONTRACT_CODES:
            params["worktype"] = JOB_CONTRACT_CODES[request.job_contract]

        if request.job_type and request.job_type in JOB_TYPE_CODES:
            params["workarrangement"] = JOB_TYPE_CODES[request.job_type]

        if request.hours_old:
            days = request.hours_old / 24
            for threshold, code in sorted(DATE_RANGE_MAP.items()):
                if days <= threshold:
                    params["daterange"] = code
                    break

        # Make request
        try:
            response = session.get(url, params=params, timeout=15)

            if response.status_code == 429:
                wait_seconds = 60
                if manager:
                    await manager.send_rate_limit(client_id, wait_seconds)
                await asyncio.sleep(wait_seconds)
                continue

            if response.status_code != 200:
                break

        except Exception:
            break

        # Parse HTML → extract job listings from __NEXT_DATA__
        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = _extract_job_listings(soup)

        if not job_cards:
            break

        # Extract jobs from cards
        for i, card in enumerate(job_cards):
            if manager:
                await manager.send_parsing(client_id, i + 1, len(job_cards))

            job = parse_job_card(card, session)
            if job and job["id"] not in seen_ids:
                seen_ids.add(job["id"])
                combined_text = " ".join(
                    [
                        job["description"] or "",
                        job["title"] or "",
                        job["location"] or "",
                    ]
                )
                if check_accuracy(combined_text, request):
                    jobs.append(job)

                if len(jobs) >= request.results_wanted:
                    break

        # Delay before next page
        page += 1
        if len(jobs) < request.results_wanted:
            delay = random.uniform(2, 5)
            await asyncio.sleep(delay)

    return jobs


def parse_job_card(job_data, session=None):
    """Enrich a job card dict with description, job_type, and job_contract."""
    try:
        if not job_data.get("id") or not job_data.get("job_url"):
            return None

        job = dict(job_data)

        # Fetch full description
        if session:
            job["description"] = get_job_description(session, job["job_url"])

        combined_text = " ".join(
            [
                job.get("description") or "",
                job.get("title") or "",
                job.get("location") or "",
            ]
        )

        job["job_contract"] = JobContractType.detect(combined_text)
        job["job_type"] = JobType.detect(combined_text)

        return job

    except Exception:
        return None


def get_job_description(session, job_url):
    """Fetch full job description from job detail page."""
    try:
        response = session.get(job_url, timeout=10)
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        # Strategy 1: Extract from __NEXT_DATA__
        next_data_script = soup.find(
            "script", id="__NEXT_DATA__", type="application/json"
        )
        if next_data_script:
            try:
                data = json.loads(next_data_script.string)
                page_props = data.get("props", {}).get("pageProps", {})
                job_detail = (
                    page_props.get("jobDetail", {})
                    or page_props.get("job", {})
                    or page_props
                )
                desc = (
                    job_detail.get("description", "")
                    or job_detail.get("jobAdDetails", {}).get("description", "")
                    or job_detail.get("content", "")
                )
                if desc:
                    return desc
            except Exception:
                pass

        # Strategy 2: Parse description from HTML
        desc_div = soup.find("div", attrs={"data-automation": "jobAdDetails"})
        if not desc_div:
            desc_div = soup.find(
                "div", class_=lambda x: x and "job-description" in x.lower()
            )
        if desc_div:
            return str(desc_div)

        return None

    except Exception:
        return None


def check_accuracy(combined_text: str, request: WebSocketSearchRequest):
    """
    Check if the detected job_contract / job_type from the combined_text
    matches what was requested.
    """
    if request.job_contract:
        detected_contract = JobContractType.detect(combined_text)
        if detected_contract.value != request.job_contract:
            return False

    if request.job_type:
        detected_type = JobType.detect(combined_text)
        if detected_type.value != request.job_type:
            return False

    return True


# ============ HELPER FUNCTIONS ============


def _extract_job_listings(soup):
    """Extract job listings from parsed HTML cards."""
    from dumps.dumps_to_json import dump_to_json, dump_raw_to_json

    cards = soup.find_all("article", attrs={"data-automation": "normalJob"})
    if not cards:
        print("[DEBUG] No job cards found in HTML")
        return []

    # Dump raw HTML cards before parsing
    raw_cards = [str(card) for card in cards]
    dump_raw_to_json(raw_cards, source="jobstreet")

    job_listings = []
    for card in cards:
        job = _parse_html_card(card)
        if job:
            job_listings.append(job)

    if job_listings:
        dump_to_json(job_listings, source="jobstreet")

    return job_listings


def _parse_html_card(card):
    """Parse a single job card HTML element into a dict."""
    try:
        # Job ID
        job_id = card.get("data-job-id", "")
        if not job_id:
            return None

        # Title & URL
        title_el = card.find("a", attrs={"data-automation": "jobTitle"})
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        href = title_el.get("href", "")
        job_url = (
            urljoin(BASE_URL, href.split("?")[0])
            if href
            else f"{BASE_URL}/en/job/{job_id}"
        )

        # Company
        company_el = card.find("a", attrs={"data-automation": "jobCompany"})
        company = company_el.get_text(strip=True) if company_el else "N/A"

        # Location
        loc_els = card.find_all("span", attrs={"data-automation": "jobLocation"})
        location = (
            ", ".join(el.get_text(strip=True) for el in loc_els)
            if loc_els
            else "Indonesia"
        )

        # Salary
        salary_el = card.find("span", attrs={"data-automation": "jobSalary"})
        salary = salary_el.get_text(strip=True) if salary_el else None

        # Date
        date_el = card.find("span", attrs={"data-automation": "jobListingDate"})
        date_posted = (
            _parse_relative_date(date_el.get_text(strip=True)) if date_el else None
        )

        return {
            "id": f"jobstreet_{job_id}",
            "title": title,
            "company": company,
            "company_url": "",
            "location": location,
            "salary": salary,
            "date_posted": date_posted,
            "job_url": job_url,
            "description": None,
            "job_type": None,
            "job_contract": None,
            "source": "jobstreet",
        }
    except Exception:
        return None


def _parse_relative_date(display_text: str):
    """Parse relative date string like '2d ago', '1h ago' to YYYY-MM-DD."""
    if not display_text:
        return None

    now = datetime.now()

    match = re.search(r"(\d+)\s*([dhm])", display_text.lower())
    if match:
        value = int(match.group(1))
        unit = match.group(2)

        if unit == "d":
            dt = now - timedelta(days=value)
        elif unit == "h":
            dt = now - timedelta(hours=value)
        elif unit == "m":
            dt = now - timedelta(minutes=value)
        else:
            return None

        return dt.strftime("%Y-%m-%d")

    if "just" in display_text.lower() or "baru" in display_text.lower():
        return now.strftime("%Y-%m-%d")

    return None


# ============ TESTING ============
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("JOBSTREET JOB SCRAPER - TEST MODE")
    print("=" * 60)

    request = WebSocketSearchRequest(
        keywords="frontend developer",
        location="",
        results_wanted=5,
        hours_old=720,
        job_contract="full_time",
        job_type="remote",
    )

    import asyncio

    jobs = asyncio.run(search_jobs_jobstreet(request=request))

    print(f"\n{'=' * 60}")
    print(f"RESULTS: Found {len(jobs)} jobs")
    print("=" * 60)

    print(f"\nTest completed!")
