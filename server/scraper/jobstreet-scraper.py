"""
JobStreet Job Scraper - Core Functions
"""

import requests
import time
import random
import asyncio
import json
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urljoin
from typing import Callable, Optional


# ============ CONFIG ============
BASE_URL = "https://id.jobstreet.com"

HEADERS = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9,id;q=0.8",
    "cache-control": "max-age=0",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

JOB_TYPE_CODES = {
    "full_time": "242",
    "part_time": "243",
    "contract": "244",
    "temporary": "244",
    "internship": "245",
}

WORK_TYPE_MAP = {
    "hybrid": "hybrid",
    "on-site": "onsite",
    "remote": "remote",
    "work from home": "remote",
}

DATE_RANGE_MAP = {
    1: "1",
    3: "3",
    7: "7",
    14: "14",
    30: "31",
}


# ============ MAIN FUNCTIONS ============


async def search_jobs_async(
    keywords: str,
    location: str = "",
    job_type: str = None,
    is_remote: bool = False,
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
    page = 1

    session = requests.Session()
    session.headers.update(HEADERS)

    while len(jobs) < results_wanted and page <= 20:
        # Notify: fetching page
        if on_progress:
            await on_progress("fetching_page", {"page": page, "jobs_found": len(jobs)})

        # Build URL
        keyword_slug = keywords.lower().replace(" ", "-")
        url = f"{BASE_URL}/id/{quote_plus(keyword_slug)}-jobs"

        if location:
            loc_slug = location.replace(" ", "-")
            url += f"/in-{quote_plus(loc_slug)}"

        # Build params
        params = {"page": page}

        if job_type and job_type in JOB_TYPE_CODES:
            params["worktype"] = JOB_TYPE_CODES[job_type]

        if is_remote:
            params["workarrangement"] = "remote"

        if hours_old:
            days = hours_old / 24
            for threshold, code in sorted(DATE_RANGE_MAP.items()):
                if days <= threshold:
                    params["daterange"] = code
                    break

        # Make request
        try:
            response = session.get(url, params=params, timeout=15)

            if response.status_code == 429:
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
        job_cards = _extract_job_listings(soup)

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
        page += 1
        if len(jobs) < results_wanted:
            delay = random.uniform(2, 5)
            await asyncio.sleep(delay)

    return jobs


def search_jobs(
    keywords: str,
    location: str = "",
    job_type: str = None,
    is_remote: bool = False,
    hours_old: int = None,
    results_wanted: int = 25,
    existing_ids: set = None,
):
    """
    Search JobStreet jobs with given parameters (sync version).

    Args:
        keywords: Search keywords (e.g., "python developer")
        location: Location to search (e.g., "Jakarta")
        job_type: One of: full_time, part_time, internship, contract, temporary
        is_remote: Filter remote jobs only
        hours_old: Filter jobs posted within X hours
        results_wanted: Number of results to fetch (max ~20 pages)
        existing_ids: Set of job IDs to skip (already in database)

    Returns:
        List of job dictionaries
    """
    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    page = 1

    session = requests.Session()
    session.headers.update(HEADERS)

    while len(jobs) < results_wanted and page <= 20:
        # Build URL
        keyword_slug = keywords.lower().replace(" ", "-")
        url = f"{BASE_URL}/id/{quote_plus(keyword_slug)}-jobs"

        if location:
            loc_slug = location.replace(" ", "-")
            url += f"/in-{quote_plus(loc_slug)}"

        # Build params
        params = {"page": page}

        if job_type and job_type in JOB_TYPE_CODES:
            params["worktype"] = JOB_TYPE_CODES[job_type]

        if is_remote:
            params["workarrangement"] = "remote"

        if hours_old:
            days = hours_old / 24
            for threshold, code in sorted(DATE_RANGE_MAP.items()):
                if days <= threshold:
                    params["daterange"] = code
                    break

        # Make request
        try:
            response = session.get(url, params=params, timeout=15)
            print(f"URL: {response.url}")

            if response.status_code == 429:
                time.sleep(60)
                continue

            if response.status_code != 200:
                break

        except Exception:
            break

        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = _extract_job_listings(soup)

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
        page += 1
        if len(jobs) < results_wanted:
            delay = random.uniform(2, 5)
            time.sleep(delay)

    return jobs


def parse_job_card(job_data, session=None):
    """Parse a single job card into standardized dict."""
    try:
        # Job ID
        job_id = str(
            job_data.get("id")
            or job_data.get("jobId")
            or job_data.get("listingId")
            or ""
        )
        if not job_id:
            return None

        prefixed_id = f"jobstreet_{job_id}"

        # Title
        title = job_data.get("title") or job_data.get("jobTitle") or "N/A"

        # Company
        company_name = "N/A"
        company_url = ""
        advertiser = job_data.get("advertiser", {}) or {}
        if advertiser:
            company_name = advertiser.get("description", "N/A")
            company_id = advertiser.get("id", "")
            if company_id:
                company_url = f"{BASE_URL}/en/companies/{company_id}"
        if company_name == "N/A":
            company_name = job_data.get("companyName", "N/A")
            company_meta = job_data.get("companyMeta", {}) or {}
            if company_meta.get("id"):
                company_url = f"{BASE_URL}/en/companies/{company_meta['id']}"

        # Location
        location = _extract_location(job_data)

        # Salary
        salary = _extract_salary(job_data)

        # Date posted
        date_posted = _extract_date(job_data)

        # Job URL
        job_url = ""
        if job_data.get("jobUrl"):
            job_url = urljoin(BASE_URL, job_data["jobUrl"])
        elif job_data.get("job_url"):
            job_url = job_data["job_url"]
        else:
            job_url = f"{BASE_URL}/en/job/{job_id}"

        # Work type
        work_type = _extract_work_arrangement(job_data)

        job = {
            "id": prefixed_id,
            "title": title,
            "company": company_name,
            "company_url": company_url,
            "location": location,
            "salary": salary,
            "date_posted": date_posted,
            "job_url": job_url,
            "description": None,
            "work_type": work_type,
            "source": "jobstreet",
        }

        # Fetch full description if session provided
        if session:
            job_details = get_job_description(session, job_url)
            job["description"] = job_details["description"]
            if not work_type and job_details.get("work_type"):
                job["work_type"] = job_details["work_type"]

        return job

    except Exception:
        return None


def get_job_description(session, job_url):
    """Fetch full job description and work type from job detail page."""
    try:
        response = session.get(job_url, timeout=10)
        if response.status_code != 200:
            return {"description": None, "work_type": None}

        soup = BeautifulSoup(response.text, "html.parser")

        description = None
        work_type = None

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

                # Description
                desc = (
                    job_detail.get("description", "")
                    or job_detail.get("jobAdDetails", {}).get("description", "")
                    or job_detail.get("content", "")
                )
                if desc:
                    description = desc

                # Work arrangement
                work_type = _extract_work_arrangement(job_detail)

            except Exception:
                pass

        # Strategy 2: Parse description from HTML
        if not description:
            desc_div = soup.find("div", attrs={"data-automation": "jobAdDetails"})
            if not desc_div:
                desc_div = soup.find(
                    "div", class_=lambda x: x and "job-description" in x.lower()
                )
            if not desc_div:
                desc_div = soup.find("div", attrs={"data-automation": "jobDescription"})

            if desc_div:
                description = str(desc_div)

        return {"description": description, "work_type": work_type}

    except Exception:
        return {"description": None, "work_type": None}


# ============ HELPER FUNCTIONS ============


def _extract_job_listings(soup):
    """Extract job listings from parsed HTML (JSON or HTML cards)."""
    # Try __NEXT_DATA__ JSON first
    next_data_script = soup.find("script", id="__NEXT_DATA__", type="application/json")
    if next_data_script:
        try:
            data = json.loads(next_data_script.string)
            page_props = data.get("props", {}).get("pageProps", {})

            search_data = (
                page_props.get("search", {})
                or page_props.get("searchResults", {})
                or page_props
            )
            job_listings = search_data.get("data", []) or search_data.get("jobs", [])

            if isinstance(job_listings, dict) and "data" in job_listings:
                job_listings = job_listings["data"]

            if job_listings:
                return job_listings
        except:
            pass

    # Fallback: parse HTML cards directly
    return _parse_html_cards(soup)


def _parse_html_cards(soup):
    """Parse job cards directly from HTML as fallback method."""
    from utils.dumps_to_json import dump_to_json

    try:
        job_listings = []

        # Find job card elements
        cards = soup.find_all("article", attrs={"data-automation": "normalJob"})
        if not cards:
            cards = soup.find_all("div", attrs={"data-automation": "normalJob"})
        if not cards:
            cards = soup.find_all("article", attrs={"data-card-type": "JobCard"})

        for card in cards:
            job = {}

            # Title & URL
            title_el = card.find("a", attrs={"data-automation": "jobTitle"})
            if not title_el:
                title_el = card.find("h3") or card.find("h2")

            if title_el:
                job["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                if href:
                    job["job_url"] = urljoin(BASE_URL, href)
                    id_match = re.search(r"/job/(\d+)", href) or re.search(
                        r"-(\d+)$", href
                    )
                    if id_match:
                        job["id"] = f"jobstreet_{id_match.group(1)}"

            # Company
            company_el = card.find(
                "a", attrs={"data-automation": "jobCompany"}
            ) or card.find("span", attrs={"data-automation": "jobCompany"})
            if company_el:
                job["company"] = company_el.get_text(strip=True)

            # Location
            location_el = card.find(
                "a", attrs={"data-automation": "jobLocation"}
            ) or card.find("span", attrs={"data-automation": "jobLocation"})
            if location_el:
                job["location"] = location_el.get_text(strip=True)

            # Salary
            salary_el = card.find("span", attrs={"data-automation": "jobSalary"})
            if salary_el:
                job["salary"] = salary_el.get_text(strip=True)

            # Date
            date_el = card.find("time") or card.find(
                "span", attrs={"data-automation": "jobListingDate"}
            )
            if date_el:
                job["date_posted"] = _parse_relative_date(date_el.get_text(strip=True))

            # Work type from card text
            job["work_type"] = _extract_work_type_from_text(card)

            if job.get("title") and job.get("id"):
                job_listings.append(job)

        # Dump results to JSON for debugging
        dump_to_json(job_listings)

        return job_listings

    except Exception:
        return None


def _extract_location(job_data):
    """Extract location from job data with fallbacks."""
    location_data = job_data.get("jobLocation", {}) or {}
    if isinstance(location_data, dict):
        location = location_data.get("label", "") or location_data.get(
            "countryCode", ""
        )
    elif isinstance(location_data, str):
        location = location_data
    else:
        location = ""

    if not location:
        loc = job_data.get("location", "")
        if isinstance(loc, str):
            location = loc
        elif isinstance(loc, dict):
            location = loc.get("label", loc.get("name", ""))

    if not location:
        parts = [job_data.get("suburb", ""), job_data.get("area", "")]
        location = ", ".join(p for p in parts if p)

    return location or "Indonesia"


def _extract_salary(job_data):
    """Extract salary info from job data."""
    salary_data = job_data.get("salary")
    if not salary_data:
        return job_data.get("salaryLabel") or None

    if isinstance(salary_data, str):
        return salary_data

    if isinstance(salary_data, dict):
        label = salary_data.get("label", "")
        if label:
            return label

        min_sal = salary_data.get("min") or salary_data.get("minimum")
        max_sal = salary_data.get("max") or salary_data.get("maximum")
        currency = salary_data.get("currency", "IDR")

        if min_sal and max_sal:
            return f"{currency} {min_sal:,} - {max_sal:,}"
        elif min_sal:
            return f"{currency} {min_sal:,}+"
        elif max_sal:
            return f"{currency} up to {max_sal:,}"

    return None


def _extract_date(job_data):
    """Extract date posted from job data."""
    listing_date = (
        job_data.get("listingDate")
        or job_data.get("postedAt")
        or job_data.get("createdAt")
    )
    if listing_date:
        try:
            if "T" in str(listing_date):
                dt = datetime.fromisoformat(listing_date.replace("Z", "+00:00"))
                return dt.strftime("%Y-%m-%d")
            elif re.match(r"\d{4}-\d{2}-\d{2}", str(listing_date)):
                return str(listing_date)[:10]
        except Exception:
            pass

    # Try relative display (e.g., "2d ago")
    display_date = job_data.get("listingDateDisplay", "")
    return _parse_relative_date(display_date)


def _extract_work_arrangement(job_data):
    """Extract work type/arrangement from job data."""
    work_arrangements = job_data.get("workArrangements", {}) or {}
    if work_arrangements:
        wa_data = work_arrangements.get("data", []) or []
        for wa in wa_data:
            label = wa.get("label", "") if isinstance(wa, dict) else str(wa)
            for key, val in WORK_TYPE_MAP.items():
                if key in label.lower():
                    return val

    # Fallback: check workType field
    work_type_raw = job_data.get("workType", "")
    if isinstance(work_type_raw, str):
        wt_lower = work_type_raw.lower()
        if "remote" in wt_lower:
            return "remote"
        elif "hybrid" in wt_lower:
            return "hybrid"

    return None


def _extract_work_type_from_text(card):
    """Extract work type from card text content (HTML fallback)."""
    text = card.get_text(separator=" | ", strip=True).lower()

    # Check arrangement first (higher priority)
    if "remote" in text:
        return "remote"
    if "hybrid" in text:
        return "hybrid"
    if "di tempat" in text or "on-site" in text:
        return "onsite"

    # Check job type
    if "magang" in text or "internship" in text:
        return "internship"
    if "kontrak" in text or "contract" in text:
        return "contract"
    if "paruh waktu" in text or "part time" in text:
        return "part_time"
    if "penuh waktu" in text or "full time" in text:
        return "full_time"

    return None


def _parse_relative_date(display_text: str) -> Optional[str]:
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

    # Hardcoded test params
    keyword = "frontend developer"
    location = ""
    max_results = 5
    hours_old = 720
    job_type = "full_time"
    is_remote = False

    # this produces :
    # https://id.jobstreet.com/id/frontend-developer-jobs/in-Jakarta-Selatan/full-time?daterange=31

    jobs = search_jobs(
        keywords=keyword,
        location=location,
        results_wanted=max_results,
        hours_old=hours_old,
        job_type=job_type,
        is_remote=is_remote,
    )

    print(f"\n{'=' * 60}")
    print(f"RESULTS: Found {len(jobs)} jobs")
    print("=" * 60)

    print(f"\nTest completed!")
