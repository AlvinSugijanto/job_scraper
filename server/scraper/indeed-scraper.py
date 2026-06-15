"""
Indeed Job Scraper - Refactored
"""

from schemas import WebSocketSearchRequest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import httpx

logger = logging.getLogger(__name__)

from enums import JobContractType, JobType
from core import ConnectionManager
import random
import asyncio
import json
import re
from datetime import datetime, timedelta
from urllib.parse import quote, urlparse, parse_qs, urlencode, urlunparse
from bs4 import BeautifulSoup
from repositories import banned_company, banned_keyword


# ============ CONFIG ============
# Use .com as base, but can be extended for other countries
BASE_URL = "https://www.indeed.com"
HEADERS = {
    "authority": "www.indeed.com",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    "cache-control": "max-age=0",
    "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
}

# Job type mapping for Indeed's `jt` parameter
# https://www.indeed.com/jobs?q=python&jt=fulltime
JOB_CONTRACT_CODES = {
    "full_time": "fulltime",
    "part_time": "parttime",
    "internship": "internship",
    "contract": "contract",
    "temporary": "temporary",
}

# Indeed does not have a built-in hybrid filter, but hybrid can be included in location search
# Location can be set to "Remote" for remote jobs
JOB_TYPE_CODES = {
    "remote": None,  # Handled by location="Remote" + additional remote filtering via keywords
    "hybrid": None,  # Not directly supported, can be included via keyword search or location search
    "onsite": None,
}


# Indeed uses `fromage` parameter for days filter
# fromage=1 (last 24h), fromage=3 (3 days), fromage=7 (7 days), fromage=14 (14 days)
def hours_old_to_fromage(hours_old: int) -> int:
    """Convert hours_old to Indeed's fromage parameter (days)."""
    if hours_old is None:
        return None
    days = max(1, hours_old // 24)  # minimum 1 day
    # Map to closest Indeed-supported values: 1, 3, 7, 14
    if days <= 1:
        return 1
    elif days <= 3:
        return 3
    elif days <= 7:
        return 7
    else:
        return 14


# Pagination: Indeed uses `start` parameter, increments of 10
# Timeout and Delay Configs
CLIENT_TIMEOUT = 10
DESCRIPTION_TIMEOUT = 10

CARD_DELAY_MIN = 5
CARD_DELAY_MAX = 10

PAGE_DELAY_MIN = 10
PAGE_DELAY_MAX = 20

RATE_LIMIT_WAIT_MIN = 30
RATE_LIMIT_WAIT_MAX = 50

# ============ MAIN FUNCTION ============


async def search_jobs_indeed(
    request: WebSocketSearchRequest,
    existing_ids: set = None,
    manager: ConnectionManager = None,
    client_id: str = "",
) -> list:
    logger.info(
        f"[Indeed] Scraper started | keywords='{request.keywords}' | "
        f"location='{request.location}' | results_wanted={request.results_wanted} | "
        f"job_contract={request.job_contract} | job_type={request.job_type} | "
        f"hours_old={request.hours_old} | easy_apply={request.easy_apply}"
    )

    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    banned_names, banned_keywords = _load_banned_filters()
    scrape_start_time = datetime.now()
    stats = {
        "parsed": 0,
        "skipped_duplicate": 0,
        "skipped_accuracy": 0,
        "skipped_keyword": 0,
        "rate_limit_hits": 0,
        "jobs_found": 0,
        "pages_fetched": 0,
    }

    async with httpx.AsyncClient(headers=HEADERS, timeout=CLIENT_TIMEOUT) as client:
        async for page, job_cards in _fetch_pages(
            client, request, manager, client_id, stats
        ):
            stats["pages_fetched"] += 1
            for i, card in enumerate(job_cards):
                if manager and manager.is_cancelled(client_id):
                    logger.info(
                        f"[Indeed] Cancelled mid-page by '{client_id}' (card {i + 1}/{len(job_cards)} page {page})."
                    )
                    break

                if manager:
                    await manager.send_parsing(client_id, i + 1, len(job_cards))

                job = await _process_card(
                    client,
                    card,
                    seen_ids,
                    banned_names,
                    banned_keywords,
                    request,
                    stats,
                )
                await asyncio.sleep(random.uniform(CARD_DELAY_MIN, CARD_DELAY_MAX))

                if job:
                    jobs.append(job)
                    stats["jobs_found"] += 1
                    if len(jobs) >= request.results_wanted:
                        logger.info(
                            f"[Indeed] Target of {request.results_wanted} jobs reached."
                        )
                        break

            logger.info(
                f"[Indeed] Page {page} done | total_collected={len(jobs)} | "
                f"skipped_duplicate={stats['skipped_duplicate']} | "
                f"skipped_accuracy={stats['skipped_accuracy']} | "
                f"skipped_keyword={stats['skipped_keyword']}"
            )

            if len(jobs) >= request.results_wanted:
                break

    if jobs:
        from dumps.dumps_to_json import dump_to_json

        dump_to_json(jobs, source="indeed")

    elapsed = (datetime.now() - scrape_start_time).total_seconds()
    logger.info(
        f"[Indeed] Scraper finished | jobs_collected={len(jobs)} | "
        f"cards_parsed={stats['parsed']} | rate_limit_hits={stats['rate_limit_hits']} | "
        f"pages_fetched={stats['pages_fetched']} | elapsed={elapsed:.1f}s"
    )

    return jobs


# ============ PRIVATE HELPERS ============


def _load_banned_filters() -> tuple[set, set]:
    """Load banned companies and keywords from database."""
    try:
        from core.database import SessionLocal

        db = SessionLocal()
        banned_names = {c.name.strip().lower() for c in banned_company.getAll(db)}
        banned_keywords = {k.keyword.strip().lower() for k in banned_keyword.getAll(db)}
        db.close()
        logger.info(
            f"[Indeed] Loaded {len(banned_names)} banned companies and {len(banned_keywords)} banned keywords."
        )
        return banned_names, banned_keywords
    except Exception as e:
        logger.error(f"[Indeed] Failed to load banned filters from DB: {e}")
        return set(), set()


async def _fetch_pages(
    client: httpx.AsyncClient,
    request: WebSocketSearchRequest,
    manager: ConnectionManager,
    client_id: str,
    stats: dict,
):
    """Async generator — yields (page_number, job_cards[]) per page."""
    start = 0
    page = 1
    max_pages = random.randint(5, 15)

    while page <= max_pages:
        if manager and manager.is_cancelled(client_id):
            logger.info(f"[Indeed] Scrape cancelled by '{client_id}' on page {page}.")
            return

        if manager:
            await manager.send_fetching_page(
                client_id, page, stats["jobs_found"], portal="Indeed"
            )

        params = _build_params(request, start)
        job_cards = await _fetch_page_with_retry(
            client, params, page, manager, client_id, stats
        )

        if job_cards is None:  # unrecoverable error
            return
        if not job_cards:  # empty page = end of results
            break

        yield page, job_cards

        start += len(job_cards)
        page += 1
        await asyncio.sleep(random.uniform(PAGE_DELAY_MIN, PAGE_DELAY_MAX))


def _build_params(request: WebSocketSearchRequest, start: int) -> dict:
    """Build Indeed search query params."""
    params = {
        "q": request.keywords,
        "l": request.location if request.location else "",
        "start": start,
    }
    if request.distance:
        params["radius"] = request.distance

    # Job contract filter
    if request.job_contract and request.job_contract in JOB_CONTRACT_CODES:
        params["jt"] = JOB_CONTRACT_CODES[request.job_contract]

    # Date filter
    fromage = hours_old_to_fromage(request.hours_old)
    if fromage:
        params["fromage"] = fromage

    # Job type (remote/hybrid/onsite)
    # Indeed doesn't have a built-in hybrid/onsite filter, only remote via location="Remote"
    # For remote: set location="Remote" and optionally add remote keyword to query
    if request.job_type == "remote":
        # If location is not already set to "Remote", append "Remote" to location
        if not params["l"] or "remote" not in params["l"].lower():
            params["l"] = "Remote" if not params["l"] else f"{params['l']}, Remote"
        # Also add remote keyword to ensure remote jobs appear
        if "remote" not in params["q"].lower():
            params["q"] = f"{params['q']} remote"

    # Easy apply filter
    if request.easy_apply:
        params["filter"] = "explvl%3Aentry_level"  # This is a guess, needs verification

    # Sort by date if hours_old is provided
    if request.hours_old:
        params["sort"] = "date"

    return params


async def _fetch_page_with_retry(
    client: httpx.AsyncClient,
    params: dict,
    page: int,
    manager: ConnectionManager,
    client_id: str,
    stats: dict,
) -> list | None:
    """Fetch a single search result page. Returns card list, empty list, or None on error."""
    try:
        response = await client.get(
            f"{BASE_URL}/jobs",
            params=params,
            follow_redirects=True,
        )

        if response.status_code == 403:
            # Indeed may block requests, try with mobile headers
            logger.warning(
                f"[Indeed] Blocked (403) on page {page}. Trying mobile headers..."
            )
            client.headers.update(
                {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 Indeed App 242.0",
                    "x-requested-with": "com.indeed.android.jobsearch",
                    "sec-ch-ua-platform": '"Android"',
                }
            )
            response = await client.get(
                f"{BASE_URL}/jobs", params=params, follow_redirects=True
            )
            if response.status_code == 403:
                logger.error(
                    f"[Indeed] Still blocked after mobile headers on page {page}."
                )
                return None

        if response.status_code == 429:
            stats["rate_limit_hits"] += 1
            wait_seconds = random.uniform(RATE_LIMIT_WAIT_MIN, RATE_LIMIT_WAIT_MAX)
            logger.warning(
                f"[Indeed] Rate limit on page {page}. Waiting {wait_seconds:.1f}s..."
            )
            if manager:
                await manager.send_rate_limit(client_id, wait_seconds, portal="Indeed")
            await asyncio.sleep(wait_seconds)
            return await _fetch_page_with_retry(
                client, params, page, manager, client_id, stats
            )

        if response.status_code != 200:
            logger.error(
                f"[Indeed] HTTP {response.status_code} on page {page}. Aborting."
            )
            return None

    except Exception as e:
        logger.error(
            f"[Indeed] Request failed on page {page} | {type(e).__name__}: {e}"
        )
        return None

    # Parse HTML and extract job cards
    soup = BeautifulSoup(response.text, "html.parser")
    # Indeed uses various selectors for job cards; try multiple approaches
    job_cards = soup.find_all(
        "div",
        class_=re.compile(r"job_seen_beacon|cardOutline|tapItem|jobsearch-SerpJobCard"),
    )
    if not job_cards:
        # Fallback: look for any div containing job data
        job_cards = soup.select('[data-jk], [data-urn], [data-tn-element="jobTitle"]')
        if not job_cards:
            # Try to extract embedded JSON data
            embedded_jobs = _extract_embedded_json(soup)
            if embedded_jobs:
                return embedded_jobs

    if not job_cards:
        logger.info(f"[Indeed] No cards on page {page}. End of results.")

    return job_cards


def _extract_embedded_json(soup: BeautifulSoup) -> list:
    """
    Extract job data from embedded JSON-LD or mosaic provider data.
    Returns a list of job dictionaries.
    """
    jobs = []
    # Method 1: JSON-LD script tag
    schema_scripts = soup.find_all("script", type="application/ld+json")
    for script in schema_scripts:
        try:
            data = json.loads(script.string)
            if data.get("@type") == "ItemList" and "itemListElement" in data:
                for item in data["itemListElement"]:
                    job = item.get("item", {})
                    if job.get("@type") == "JobPosting":
                        jobs.append(job)
        except (json.JSONDecodeError, AttributeError):
            continue

    # Method 2: Mosaic provider data (window.mosaic.providerData)
    # This is more complex and may require regex or additional parsing
    # Not implemented in this version

    return jobs


async def _process_card(
    client: httpx.AsyncClient,
    card,
    seen_ids: set,
    banned_names: set,
    banned_keywords: set,
    request: WebSocketSearchRequest,
    stats: dict,
) -> dict | None:
    """Parse a card and run all filters. Returns job dict or None if filtered out."""
    job = await _parse_job_card(client, card)
    stats["parsed"] += 1

    if not job:
        return None

    if not _passes_filters(
        job, seen_ids, banned_names, banned_keywords, request, stats
    ):
        return None

    seen_ids.add(job["id"])
    logger.debug(
        f"[Indeed] Job accepted | id='{job['id']}' | title='{job['title']}' | "
        f"company='{job['company']}' | location='{job['location']}'"
    )
    return job


def _passes_filters(
    job: dict,
    seen_ids: set,
    banned_names: set,
    banned_keywords: set,
    request: WebSocketSearchRequest,
    stats: dict,
) -> bool:
    """Pure filter logic — no side effects except stats increment."""
    if job.get("company") and job["company"].strip().lower() in banned_names:
        logger.info(f"[Indeed] Banned company: '{job['company']}', skipping.")
        return False

    if job["id"] in seen_ids:
        logger.info(
            f"[Indeed] Duplicate job ID: '{job['id']}' ({job['title']}), skipping."
        )
        stats["skipped_duplicate"] += 1
        return False

    combined_text = " ".join(
        [job["description"] or "", job["title"] or "", job["location"] or ""]
    )

    if not _check_accuracy(combined_text, request):
        logger.info(
            f"[Indeed] Accuracy check failed for job ID: '{job['id']}' ({job['title']}), skipping."
        )
        stats["skipped_accuracy"] += 1
        return False

    matched_keyword = next(
        (kw for kw in banned_keywords if kw in combined_text.lower()), None
    )
    if matched_keyword:
        logger.info(f"[Indeed] Banned keyword '{matched_keyword}' found, skipping.")
        stats["skipped_keyword"] += 1
        return False

    return True


async def _parse_job_card(client: httpx.AsyncClient, card) -> dict | None:
    """Parse a single job card HTML element."""
    try:
        # Extract job ID from data attribute or href
        job_id = None
        job_url = None

        # Try to get job ID from data-jk attribute
        if isinstance(card, dict):
            # If card is a dict from JSON extraction
            return _parse_job_from_json(card)

        # HTML element parsing
        if card.has_attr("data-jk"):
            job_id = card["data-jk"]
            job_url = f"{BASE_URL}/viewjob?jk={job_id}"
        else:
            # Try to find link
            link = card.find("a", href=re.compile(r"/viewjob\?jk=|/rc/clk\?"))
            if not link:
                link = card.find("a", class_=re.compile(r"jcs-JobTitle|jobtitle"))
            if link and link.has_attr("href"):
                href = link["href"]
                if "jk=" in href:
                    job_id = href.split("jk=")[-1].split("&")[0]
                    job_url = f"{BASE_URL}{href}" if href.startswith("/") else href
                elif "/rc/clk" in href:
                    job_id = href.split("/")[-1].split("?")[0]
                    job_url = f"{BASE_URL}{href}" if href.startswith("/") else href

        if not job_id:
            return None

        # Title
        title_elem = card.find("a", class_=re.compile(r"jcs-JobTitle|jobtitle"))
        if not title_elem:
            title_elem = card.find("h2", class_=re.compile(r"title"))
        title = title_elem.get_text(strip=True) if title_elem else "N/A"

        # Company
        company_elem = card.find("span", class_=re.compile(r"companyName|company"))
        if not company_elem:
            company_elem = card.find("div", class_=re.compile(r"company_location"))
        company = company_elem.get_text(strip=True) if company_elem else "N/A"

        # Location
        location_elem = card.find("div", class_=re.compile(r"companyLocation|location"))
        if not location_elem:
            location_elem = card.find("span", class_=re.compile(r"location"))
        location = location_elem.get_text(strip=True) if location_elem else "N/A"

        # Salary
        salary_elem = card.find("div", class_=re.compile(r"salaryOnly|salary"))
        salary = salary_elem.get_text(strip=True) if salary_elem else None

        # Date posted
        date_elem = card.find("span", class_=re.compile(r"date"))
        date_posted = None
        if date_elem:
            date_text = date_elem.get_text(strip=True)
            date_posted = _parse_date_string(date_text)

        # Company URL
        company_url = ""
        company_link = card.find("a", href=re.compile(r"/companies/"))
        if company_link and company_link.has_attr("href"):
            company_url = company_link["href"]

        # Description
        description = await _get_job_description(client, job_id)

        # Job contract and type detection
        combined_text = " ".join([description or "", title, location])

        return {
            "id": job_id,
            "title": title,
            "company": company,
            "company_url": company_url,
            "location": location,
            "salary": salary,
            "date_posted": date_posted,
            "job_url": job_url,
            "description": description,
            "job_contract": JobContractType.detect(combined_text),
            "job_type": JobType.detect(combined_text),
            "source": "indeed",
        }

    except Exception as e:
        logger.debug(f"[Indeed] _parse_job_card error: {type(e).__name__}: {e}")
        return None


def _parse_job_from_json(job_data: dict) -> dict | None:
    """Parse job data from JSON-LD format."""
    try:
        job_id = job_data.get("identifier", "")
        if not job_id:
            job_id = (
                job_data.get("url", "").split("jk=")[-1].split("&")[0]
                if "jk=" in job_data.get("url", "")
                else ""
            )

        title = job_data.get("title", "N/A")
        company = job_data.get("hiringOrganization", {}).get("name", "N/A")
        location = (
            job_data.get("jobLocation", {})
            .get("address", {})
            .get("addressLocality", "N/A")
        )
        salary = job_data.get("baseSalary", {}).get("value", {}).get("value", None)
        if salary:
            salary_currency = job_data.get("baseSalary", {}).get("currency", "USD")
            salary = f"{salary} {salary_currency}"
        date_posted = job_data.get("datePosted", "")
        if date_posted:
            try:
                date_posted = datetime.fromisoformat(date_posted).strftime("%Y-%m-%d")
            except:
                date_posted = None
        description = job_data.get("description", "")
        job_url = job_data.get("url", "")

        return {
            "id": job_id,
            "title": title,
            "company": company,
            "company_url": "",
            "location": location,
            "salary": salary,
            "date_posted": date_posted,
            "job_url": job_url,
            "description": description,
            "job_contract": JobContractType.detect(
                " ".join([description, title, location])
            ),
            "job_type": JobType.detect(" ".join([description, title, location])),
            "source": "indeed",
        }
    except Exception as e:
        logger.debug(f"[Indeed] _parse_job_from_json error: {type(e).__name__}: {e}")
        return None


def _parse_date_string(date_text: str) -> str | None:
    """Parse Indeed's relative date strings to YYYY-MM-DD."""
    if not date_text:
        return None

    date_text = date_text.lower().strip()
    today = datetime.now()

    if "hour" in date_text or "hours" in date_text:
        # "1 hour ago", "2 hours ago"
        hours = int(re.search(r"\d+", date_text).group())
        date = today - timedelta(hours=hours)
        return date.strftime("%Y-%m-%d")
    elif "day" in date_text or "days" in date_text:
        # "1 day ago", "2 days ago"
        days = int(re.search(r"\d+", date_text).group())
        date = today - timedelta(days=days)
        return date.strftime("%Y-%m-%d")
    elif "week" in date_text or "weeks" in date_text:
        # "1 week ago", "2 weeks ago"
        weeks = int(re.search(r"\d+", date_text).group())
        date = today - timedelta(weeks=weeks)
        return date.strftime("%Y-%m-%d")
    elif "month" in date_text or "months" in date_text:
        # Approximate, not accurate
        months = int(re.search(r"\d+", date_text).group())
        date = today - timedelta(days=months * 30)
        return date.strftime("%Y-%m-%d")
    else:
        # Try to parse as absolute date
        try:
            parsed_date = datetime.strptime(date_text, "%Y-%m-%d")
            return parsed_date.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


async def _get_job_description(client: httpx.AsyncClient, job_id: str) -> str | None:
    """Fetch full job description. Returns HTML string or None."""
    try:
        response = await client.get(
            f"{BASE_URL}/viewjob?jk={job_id}", timeout=DESCRIPTION_TIMEOUT
        )

        if response.status_code == 403:
            # Try with mobile headers
            client.headers.update(
                {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 Indeed App 242.0",
                    "x-requested-with": "com.indeed.android.jobsearch",
                    "sec-ch-ua-platform": '"Android"',
                }
            )
            response = await client.get(
                f"{BASE_URL}/viewjob?jk={job_id}", timeout=DESCRIPTION_TIMEOUT
            )
            if response.status_code == 403:
                logger.debug(
                    f"[Indeed] _get_job_description: Blocked (403) for job_id='{job_id}'"
                )
                return None

        if response.status_code == 429:
            wait_seconds = random.uniform(RATE_LIMIT_WAIT_MIN, RATE_LIMIT_WAIT_MAX)
            logger.warning(
                f"[Indeed] 429 on description fetch for job_id='{job_id}'. Sleeping {wait_seconds:.1f}s..."
            )
            await asyncio.sleep(wait_seconds)
            return await _get_job_description(client, job_id)

        if response.status_code != 200:
            logger.debug(
                f"[Indeed] _get_job_description: HTTP {response.status_code} for job_id='{job_id}'"
            )
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        # Look for description in various possible locations
        desc_elem = soup.find("div", id="jobDescriptionText")
        if not desc_elem:
            desc_elem = soup.find("div", class_=re.compile(r"jobDescriptionText"))
        if not desc_elem:
            desc_elem = soup.find("div", class_=re.compile(r"description"))
        if not desc_elem:
            # Try JSON-LD
            schema_script = soup.find("script", type="application/ld+json")
            if schema_script:
                try:
                    data = json.loads(schema_script.string)
                    if data.get("@type") == "JobPosting":
                        return data.get("description", "")
                except:
                    pass
            return None

        return str(desc_elem)

    except Exception as e:
        logger.debug(
            f"[Indeed] _get_job_description failed for job_id='{job_id}' | {type(e).__name__}: {e}"
        )
        return None


def _check_accuracy(combined_text: str, request: WebSocketSearchRequest) -> bool:
    """Check if job contract/type matches the request."""
    if request.job_contract:
        if JobContractType.detect(combined_text).value != request.job_contract:
            return False
    if request.job_type:
        if JobType.detect(combined_text).value != request.job_type:
            return False
    return True


# ============ TESTING ============
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        datefmt="%H:%M:%S",
    )

    print("\n" + "=" * 60)
    print("INDEED JOB SCRAPER - TEST MODE")
    print("=" * 60)

    request = WebSocketSearchRequest(
        keywords="frontend developer",
        location="Indonesia",
        results_wanted=5,
        hours_old=720,
        job_contract="full_time",
        job_type="remote",
    )

    jobs = asyncio.run(search_jobs_indeed(request=request))

    print(f"\n{'=' * 60}")
    print(f"RESULTS: Found {len(jobs)} jobs")
    print("=" * 60)
    print("\nTest completed!")
