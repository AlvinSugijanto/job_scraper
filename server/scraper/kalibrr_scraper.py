"""
Kalibrr Job Scraper - Core Functions
"""

from schemas import WebSocketSearchRequest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
logger = logging.getLogger(__name__)

from schemas import JobContractType, JobType
from core import ConnectionManager
import requests
import asyncio
from bs4 import BeautifulSoup


# ============ CONFIG ============
BASE_URL = "https://www.kalibrr.id/id-ID/home"
HEADERS = {
    "authority": "www.kalibrr.id",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

# Job type path segments (prefix)
# remote = work_from_home di Kalibrr
JOB_TYPE_SEGMENTS = {
    "remote": "/work_from_home/y",
    "hybrid": "/hybrid/y",
    "onsite": "",  # tidak ada filter khusus untuk onsite
}

# Job contract path segments (prefix /t/)
# Jika tidak dispesifikasi, semua tipe dimasukkan (checklist all)
# Kalibrr contract labels: contractual, freelance, full-time, part-time, internship
JOB_CONTRACT_SEGMENTS = {
    "contract": "contractual",
    "full_time": "full-time",
    "part_time": "part-time",
    "internship": "internship",
    "temporary": "freelance",
}

# Semua tipe kontrak yang ada di Kalibrr (untuk checklist all)
ALL_CONTRACT_SLUGS = ["contractual", "freelance", "full-time", "part-time"]


# ============ URL BUILDER ============


def build_kalibrr_url(request: WebSocketSearchRequest) -> str:
    """
    Build Kalibrr search URL using path segments.

    Format:
        BASE_URL
            [/work_from_home/y]   -- jika remote
            [/hybrid/y]           -- jika hybrid
            /t/<contract_slug>    -- per tipe kontrak (default: semua)
            /te/<keyword>         -- keyword search (te = text/keyword)

    Contoh:
        https://www.kalibrr.id/id-ID/home/work_from_home/y/hybrid/y/t/contractual/t/freelance/t/full-time/t/part-time/te/frontend
    """
    url = BASE_URL

    # 1. Job type segments (work_from_home / hybrid)
    job_type = request.job_type.value if request.job_type else None
    if job_type and job_type in JOB_TYPE_SEGMENTS:
        url += JOB_TYPE_SEGMENTS[job_type]

    # 2. Job contract segments
    # Jika job_contract dispesifikasi → hanya 1 tipe
    # Jika tidak dispesifikasi → include semua tipe (checklist all)
    job_contract = request.job_contract.value if request.job_contract else None
    if job_contract and job_contract in JOB_CONTRACT_SEGMENTS:
        slug = JOB_CONTRACT_SEGMENTS[job_contract]
        url += f"/t/{slug}"
    else:
        for slug in ALL_CONTRACT_SLUGS:
            url += f"/t/{slug}"

    # 3. Keyword di akhir (te = text search)
    if request.keywords:
        keyword_slug = request.keywords.strip().replace(" ", "%20")
        url += f"/te/{keyword_slug}"

    return url


# ============ MAIN FUNCTIONS ============


async def search_jobs_kalibrr(
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
    logger.info(f"Kalibrr Scraper initiated for keywords: '{request.keywords}', location: '{request.location}'")
    jobs = []
    seen_ids = existing_ids.copy() if existing_ids else set()
    page = 1

    session = requests.Session()
    session.headers.update(HEADERS)

    # Build URL once (Kalibrr filter ada di path, bukan query params)
    search_url = build_kalibrr_url(request)
    logger.info(f"[Kalibrr] Search URL: {search_url}")

    while len(jobs) < request.results_wanted:
        if manager and manager.is_cancelled(client_id):
            break

        # Notify: fetching page
        if manager:
            await manager.send_fetching_page(client_id, page, len(jobs), portal="Kalibrr")

        # Kalibrr pakai query param 'start' untuk pagination
        params = {"start": (page - 1) * 10}

        # Make request
        try:
            response = session.get(
                search_url,
                params=params,
                timeout=10,
            )

            logger.info(f"[Kalibrr] Page {page} status: {response.status_code}")

            if response.status_code == 429:
                # Rate limited - notify client
                wait_seconds = 30
                logger.warning(f"[Kalibrr] Rate limit hit (429)! Dumping info to log. Waiting {wait_seconds}s before retrying.")
                if manager:
                    await manager.send_rate_limit(client_id, wait_seconds, portal="Kalibrr")
                await asyncio.sleep(wait_seconds)
                continue

            if response.status_code != 200:
                logger.warning(f"[Kalibrr] Non-200 response ({response.status_code}), stopping.")
                break

        except Exception as e:
            logger.error(f"[Kalibrr] Request error: {e}")
            break

        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")

        # Cari semua job cards menggunakan class selector Kalibrr
        job_cards = soup.find_all(
            "div",
            class_=lambda c: (
                c
                and "k-font-dm-sans" in c
                and "k-bg-white" in c
                and "k-border-solid" in c
            ),
        )

        if not job_cards:
            print("[Kalibrr] No job cards found on this page.")
            break

        print(f"[Kalibrr] Found {len(job_cards)} job cards on page {page}")

        # Dump raw HTML cards (optional debugging)
        from dumps.dumps_to_json import dump_raw_to_json

        raw_cards = [str(card) for card in job_cards]
        dump_raw_to_json(raw_cards, source="kalibrr")

        # Extract jobs from cards
        for i, card in enumerate(job_cards):
            if manager and manager.is_cancelled(client_id):
                break

            if manager:
                await manager.send_parsing(client_id, i + 1, len(job_cards))

            job = parse_job_card(card, session)
            if job and job["id"] not in seen_ids:
                seen_ids.add(job["id"])

                # Gunakan detail gabungan untuk deteksi akurasi
                combined_text = " ".join(
                    filter(
                        None,
                        [
                            job.get("description", ""),
                            job.get("title", ""),
                            job.get("location", ""),
                            job.get("job_type", ""),
                            job.get("job_contract", ""),
                        ],
                    )
                )

                accuracy = check_accuracy(combined_text, request)
                if accuracy:
                    jobs.append(job)

                if len(jobs) >= request.results_wanted:
                    break

        page += 1
        if len(jobs) < request.results_wanted and len(job_cards) > 0:
            delay = 2  # Kalibrr doesn't seem to have strict rate limiting, 2s is safe
            await asyncio.sleep(delay)

    # Dump parsed results
    if jobs:
        from dumps.dumps_to_json import dump_to_json

        dump_to_json(jobs, source="kalibrr")

    logger.info(f"Kalibrr Scraper finished. Found {len(jobs)} jobs matching criteria.")
    return jobs


def parse_job_card(card, session=None):
    """Parse a single Kalibrr job card HTML element."""
    try:
        # Title & Link
        title_tag = card.find("h2")
        title = title_tag.get_text(strip=True) if title_tag else "N/A"

        link_tag = title_tag.find("a") if title_tag else None
        job_url = link_tag["href"] if link_tag and "href" in link_tag.attrs else ""
        if job_url and not job_url.startswith("http"):
            job_url = f"https://www.kalibrr.id{job_url}"

        # Job ID (dari URL Kalibrr format /jobs/<id>/<slug>)
        job_id = "N/A"
        if "/jobs/" in job_url:
            parts = job_url.split("/jobs/")
            if len(parts) > 1:
                job_id = f"kalibrr_{parts[1].split('/')[0]}"

        # Company
        company_tag = card.find(
            "a", class_=lambda c: c and "k-text-subdued" in c and "k-font-bold" in c
        )
        company = company_tag.get_text(strip=True) if company_tag else "N/A"

        company_url = (
            company_tag["href"] if company_tag and "href" in company_tag.attrs else ""
        )
        if company_url and not company_url.startswith("http"):
            company_url = f"https://www.kalibrr.id{company_url}"

        # === Location ===
        # Location is in: <span class="k-text-gray-500 k-block k-pointer-events-none">
        loc_tag = card.find(
            "span",
            class_=lambda c: c and "k-text-gray-500" in c and "k-block" in c,
        )
        location = loc_tag.get_text(strip=True) if loc_tag else "N/A"

        # === Salary ===
        # Salary bisa di <p class="k-text-gray-500"> ("Gaji Tidak Diumumkan")
        # atau di <span class="k-text-subdued"> (range gaji)
        salary = None
        salary_p = card.find("p", class_=lambda c: c and "k-text-gray-500" in c)
        if salary_p:
            salary_text = salary_p.get_text(strip=True)
            if "Tidak Diumumkan" not in salary_text:
                salary = salary_text
        else:
            # Cek span.k-text-subdued yang bukan company link
            salary_span = card.find(
                "span",
                class_=lambda c: (
                    c and "k-text-subdued" in c and "k-font-bold" not in (c or "")
                ),
            )
            if salary_span and salary_span != company_tag:
                salary_text = salary_span.get_text(strip=True)
                if salary_text and "Tidak Diumumkan" not in salary_text:
                    salary = salary_text

        # === Contract Type ===
        # Kalibrr punya hidden <span itemprop="employmentType"> dengan value FULL_TIME, dll
        employment_tag = card.find("span", attrs={"itemprop": "employmentType"})
        contract_text = ""
        if employment_tag:
            emp_type = employment_tag.get_text(strip=True).upper()
            contract_map = {
                "FULL_TIME": "full_time",
                "PART_TIME": "part_time",
                "CONTRACT": "contract",
                "INTERNSHIP": "internship",
                "TEMPORARY": "temporary",
                "FREELANCE": "temporary",
            }
            contract_text = contract_map.get(emp_type, "")

        # === Date Posted ===
        # Kalibrr shows "Apply before <date>" in footer
        date_posted = "N/A"
        footer = card.find(
            "span",
            class_=lambda c: (
                c and "k-text-xs" in c and "k-font-bold" in c and "k-text-gray-600" in c
            ),
        )
        if footer:
            footer_text = footer.get_text(strip=True)
            if "Apply before" in footer_text or "Lamar sebelum" in footer_text:
                date_posted = footer_text

        # === Fetch full description ===
        description = None
        if session and job_url:
            description = get_job_description(session, job_url)

        job = {
            "id": job_id,
            "title": title,
            "company": company,
            "company_url": company_url,
            "location": location,
            "salary": salary,
            "date_posted": date_posted,
            "job_url": job_url,
            "description": description,
            "job_contract": contract_text if contract_text else None,
            "source": "kalibrr",
            "job_type": None,
        }

        # Kalibrr sometimes has "remote-work-tag" class or "wfh" text
        is_remote = card.find(
            lambda t: (
                t.has_attr("class") and any("remote-work-tag" in c for c in t["class"])
            )
        )

        combined_text = " ".join(
            [
                job["title"],
                job["location"],
                contract_text,
                "remote" if is_remote else "",
            ]
        )

        # Detect job_type
        if is_remote:
            job["job_type"] = JobType.remote.value
        else:
            job["job_type"] = JobType.detect(combined_text).value

        # Fallback: detect contract from combined text if not found
        if not job["job_contract"]:
            job["job_contract"] = JobContractType.detect(combined_text).value

        return job

    except Exception as e:
        print(f"[Kalibrr] Error parsing job card: {e}")
        return None


def get_job_description(session, job_url):
    """Fetch full job description from Kalibrr job detail page."""
    try:
        response = session.get(job_url, timeout=10)
        if response.status_code != 200:
            print(f"[Kalibrr] Detail page returned {response.status_code}")
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        parts = []

        # Description: <div itemprop="description">
        desc_div = soup.find("div", attrs={"itemprop": "description"})
        if desc_div:
            parts.append(str(desc_div))

        # Qualifications: <div itemprop="qualifications">
        qual_div = soup.find("div", attrs={"itemprop": "qualifications"})
        if qual_div:
            parts.append(str(qual_div))

        if parts:
            return "\n".join(parts)

        # Fallback: cari section dengan header "Deskripsi Pekerjaan"
        for h2 in soup.find_all("h2"):
            if "Deskripsi" in h2.get_text() or "Description" in h2.get_text():
                sibling = h2.find_next_sibling("div")
                if sibling:
                    return str(sibling)

        return None

    except Exception as e:
        print(f"[Kalibrr] Error fetching description: {e}")
        return None


def check_accuracy(combined_text: str, request: WebSocketSearchRequest):
    """
    Check if the detected job_contract / job_type from the combined_text
    matches what was requested.

    Args:
        combined_text: Concatenated description + title + location string.
        request:       The original search request (has .job_contract and .job_type).

    Returns:
        {
            "passed": bool,           # True if all requested filters match
            "reasons": [str, ...]     # List of mismatch messages (empty when passed)
        }
    """

    # Check job_contract accuracy
    if request.job_contract:
        detected_contract = JobContractType.detect(combined_text)
        if detected_contract.value != request.job_contract:
            return False

    # Check job_type accuracy
    if request.job_type:
        detected_type = JobType.detect(combined_text)
        if detected_type.value != request.job_type:
            return False

    return True


# ============ TESTING ============
if __name__ == "__main__":
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

    import asyncio

    jobs = asyncio.run(search_jobs_kalibrr(request=request))

    print(f"\n{'=' * 60}")
    print(f"RESULTS: Found {len(jobs)} jobs")
    print("=" * 60)

    print("\nTest completed!")
