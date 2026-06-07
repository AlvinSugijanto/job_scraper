"""
LinkedIn Job Scraper - Refactored
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
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urlunparse
from repositories import banned_company, banned_keyword


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


async def search_jobs_linkedin(
    request: WebSocketSearchRequest,
    existing_ids: set = None,
    manager: ConnectionManager = None,
    client_id: str = "",
) -> list:
    logger.info(
        f"[LinkedIn] Scraper started | keywords='{request.keywords}' | "
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
    }

    async with httpx.AsyncClient(headers=HEADERS, timeout=CLIENT_TIMEOUT) as client:
        async for page, job_cards in _fetch_pages(
            client, request, manager, client_id, stats
        ):
            for i, card in enumerate(job_cards):
                if manager and manager.is_cancelled(client_id):
                    logger.info(
                        f"[LinkedIn] Cancelled mid-page by '{client_id}' (card {i + 1}/{len(job_cards)} page {page})."
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
                            f"[LinkedIn] Target of {request.results_wanted} jobs reached."
                        )
                        break

            logger.info(
                f"[LinkedIn] Page {page} done | total_collected={len(jobs)} | "
                f"skipped_duplicate={stats['skipped_duplicate']} | "
                f"skipped_accuracy={stats['skipped_accuracy']} | "
                f"skipped_keyword={stats['skipped_keyword']}"
            )

            if len(jobs) >= request.results_wanted:
                break

    if jobs:
        from dumps.dumps_to_json import dump_to_json

        dump_to_json(jobs, source="linkedin")

    elapsed = (datetime.now() - scrape_start_time).total_seconds()
    logger.info(
        f"[LinkedIn] Scraper finished | jobs_collected={len(jobs)} | "
        f"cards_parsed={stats['parsed']} | rate_limit_hits={stats['rate_limit_hits']} | "
        f"elapsed={elapsed:.1f}s"
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
            f"[LinkedIn] Loaded {len(banned_names)} banned companies and {len(banned_keywords)} banned keywords."
        )
        return banned_names, banned_keywords
    except Exception as e:
        logger.error(f"[LinkedIn] Failed to load banned filters from DB: {e}")
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
            logger.info(f"[LinkedIn] Scrape cancelled by '{client_id}' on page {page}.")
            return

        if manager:
            await manager.send_fetching_page(
                client_id, page, stats["jobs_found"], portal="LinkedIn"
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
    """Build LinkedIn search query params."""
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
            f"{BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search",
            params=params,
        )

        if response.status_code == 429:
            stats["rate_limit_hits"] += 1
            wait_seconds = random.uniform(RATE_LIMIT_WAIT_MIN, RATE_LIMIT_WAIT_MAX)
            logger.warning(
                f"[LinkedIn] Rate limit on page {page}. Waiting {wait_seconds:.1f}s..."
            )
            if manager:
                await manager.send_rate_limit(
                    client_id, wait_seconds, portal="LinkedIn"
                )
            await asyncio.sleep(wait_seconds)
            return await _fetch_page_with_retry(
                client, params, page, manager, client_id, stats
            )

        if response.status_code != 200:
            logger.error(
                f"[LinkedIn] HTTP {response.status_code} on page {page}. Aborting."
            )
            return None

    except Exception as e:
        logger.error(
            f"[LinkedIn] Request failed on page {page} | {type(e).__name__}: {e}"
        )
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    job_cards = soup.find_all("div", class_="base-search-card")

    if not job_cards:
        logger.info(f"[LinkedIn] No cards on page {page}. End of results.")

    return job_cards


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
        f"[LinkedIn] Job accepted | id='{job['id']}' | title='{job['title']}' | "
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
        logger.info(f"[LinkedIn] Banned company: '{job['company']}', skipping.")
        return False

    if job["id"] in seen_ids:
        logger.info(
            f"[LinkedIn] Duplicate job ID: '{job['id']}' ({job['title']}), skipping."
        )
        stats["skipped_duplicate"] += 1
        return False

    combined_text = " ".join(
        [job["description"] or "", job["title"] or "", job["location"] or ""]
    )

    if not _check_accuracy(combined_text, request):
        logger.info(
            f"[LinkedIn] Accuracy check failed for job ID: '{job['id']}' ({job['title']}), skipping."
        )
        stats["skipped_accuracy"] += 1
        return False

    matched_keyword = next(
        (kw for kw in banned_keywords if kw in combined_text.lower()), None
    )
    if matched_keyword:
        logger.info(f"[LinkedIn] Banned keyword '{matched_keyword}' found, skipping.")
        stats["skipped_keyword"] += 1
        return False

    return True


async def _parse_job_card(client: httpx.AsyncClient, card) -> dict | None:
    """Parse a single job card HTML element."""
    try:
        link = card.find("a", class_="base-card__full-link")
        if not link or "href" not in link.attrs:
            return None

        href = link["href"].split("?")[0]
        job_id = href.split("-")[-1]

        title_tag = card.find("span", class_="sr-only")
        title = title_tag.get_text(strip=True) if title_tag else "N/A"

        company_tag = card.find("h4", class_="base-search-card__subtitle")
        company_link = company_tag.find("a") if company_tag else None
        company = company_link.get_text(strip=True) if company_link else "N/A"
        company_url = ""
        if company_link and company_link.has_attr("href"):
            company_url = urlunparse(urlparse(company_link["href"])._replace(query=""))

        location_tag = card.find("span", class_="job-search-card__location")
        location = location_tag.get_text(strip=True) if location_tag else "N/A"

        salary_tag = card.find("span", class_="job-search-card__salary-info")
        salary = salary_tag.get_text(strip=True) if salary_tag else None

        date_tag = card.find("time", class_="job-search-card__listdate")
        date_posted = None
        if date_tag and "datetime" in date_tag.attrs:
            try:
                date_posted = datetime.strptime(date_tag["datetime"], "%Y-%m-%d")
            except Exception:
                logger.debug(f"[LinkedIn] Failed to parse date for job_id='{job_id}'")

        description = await _get_job_description(client, job_id)
        combined_text = " ".join([description or "", title, location])

        return {
            "id": job_id,
            "title": title,
            "company": company,
            "company_url": company_url,
            "location": location,
            "salary": salary,
            "date_posted": date_posted.strftime("%Y-%m-%d") if date_posted else None,
            "job_url": f"{BASE_URL}/jobs/view/{job_id}",
            "description": description,
            "job_contract": JobContractType.detect(combined_text),
            "job_type": JobType.detect(combined_text),
            "source": "linkedin",
        }

    except Exception as e:
        logger.debug(f"[LinkedIn] _parse_job_card error: {type(e).__name__}: {e}")
        return None


async def _get_job_description(client: httpx.AsyncClient, job_id: str) -> str | None:
    """Fetch full job description. Returns HTML string or None."""
    try:
        response = await client.get(
            f"{BASE_URL}/jobs/view/{job_id}", timeout=DESCRIPTION_TIMEOUT
        )

        if response.status_code == 429:
            wait_seconds = random.uniform(RATE_LIMIT_WAIT_MIN, RATE_LIMIT_WAIT_MAX)
            logger.warning(
                f"[LinkedIn] 429 on description fetch for job_id='{job_id}'. Sleeping {wait_seconds:.1f}s..."
            )
            await asyncio.sleep(wait_seconds)
            return await _get_job_description(client, job_id)

        if response.status_code != 200:
            logger.debug(
                f"[LinkedIn] _get_job_description: HTTP {response.status_code} for job_id='{job_id}'"
            )
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        desc_div = soup.find(
            "div", class_=lambda x: x and "show-more-less-html__markup" in x
        )
        return str(desc_div) if desc_div else None

    except Exception as e:
        logger.debug(
            f"[LinkedIn] _get_job_description failed for job_id='{job_id}' | {type(e).__name__}: {e}"
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
    print("LINKEDIN JOB SCRAPER - TEST MODE")
    print("=" * 60)

    request = WebSocketSearchRequest(
        keywords="frontend developer",
        location="Indonesia",
        results_wanted=5,
        hours_old=720,
        job_contract="full_time",
        job_type="remote",
    )

    jobs = asyncio.run(search_jobs_linkedin(request=request))

    print(f"\n{'=' * 60}")
    print(f"RESULTS: Found {len(jobs)} jobs")
    print("=" * 60)
    print("\nTest completed!")
