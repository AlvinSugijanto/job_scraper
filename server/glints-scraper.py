"""
Glints Job Scraper
Standalone scraper untuk testing
Menggunakan Playwright untuk intercept GraphQL responses
Dapat menyimpan ke database
"""

from playwright.sync_api import sync_playwright
import json
from typing import Optional
from dataclasses import dataclass, asdict


@dataclass
class GlintsJob:
    """Data class untuk job dari Glints - menyesuaikan dengan kolom DB"""

    id: str
    title: str
    company: str
    company_url: Optional[str]
    location: str
    salary: Optional[str]
    date_posted: Optional[str]
    job_url: str
    description: Optional[str]
    job_type: str  # remote, hybrid, onsite
    search_keywords: Optional[str] = None

    def to_db_dict(self) -> dict:
        """Convert ke dictionary untuk insert ke DB"""
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "company_url": self.company_url,
            "location": self.location,
            "salary": self.salary,
            "date_posted": self.date_posted,
            "job_url": self.job_url,
            "description": self.description,
            "job_type": self.job_type,
            "search_keywords": self.search_keywords,
        }


class GlintsScraper:
    """Scraper untuk Glints job portal menggunakan Playwright"""

    BASE_URL = "https://glints.com/id/opportunities/jobs/explore"
    DEFAULT_AUTH_FILE = "glints_auth.json"

    def __init__(self, headless: bool = True, auth_state: str = None):
        """
        Initialize scraper

        Args:
            headless: Run browser in headless mode
            auth_state: Path to saved auth state file (from save_login_state)
        """
        self.headless = headless
        self.auth_state = auth_state
        self.jobs_data = []

    def save_login_state(self, output_file: str = None):
        """
        Login ke Glints secara manual dan simpan session state.
        Jalankan sekali, lalu gunakan file yang disimpan untuk scraping.
        """
        output_file = output_file or self.DEFAULT_AUTH_FILE

        print("\n" + "=" * 50)
        print("GLINTS LOGIN - Save Session")
        print("=" * 50)
        print("\nTips: Gunakan login Email/Password untuk hasil terbaik")

        with sync_playwright() as p:
            # Use regular browser (simpler, avoids blank popup issue)
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            print("\nOpening Glints login page...")
            page.goto("https://glints.com/id/login")

            print("\nSilakan login di browser yang terbuka.")
            print("Setelah berhasil login, tekan ENTER di terminal ini...")
            input()

            context.storage_state(path=output_file)
            print(f"\nAuth state saved to: {output_file}")

            browser.close()

        return output_file

    def _map_work_arrangement(self, work_arrangement: str) -> str:
        """Map Glints work arrangement ke job_type enum di DB"""
        if not work_arrangement:
            return "onsite"

        mapping = {
            "REMOTE": "remote",
            "HYBRID": "hybrid",
            "ONSITE": "onsite",
        }
        return mapping.get(work_arrangement.upper(), "onsite")

    def _format_salary(
        self, salary_min: int, salary_max: int, currency: str
    ) -> Optional[str]:
        """Format salary ke string"""
        if not salary_min and not salary_max:
            return None

        currency = currency or "IDR"

        if salary_min and salary_max:
            return f"{currency} {salary_min:,} - {salary_max:,}"
        elif salary_min:
            return f"{currency} {salary_min:,}+"
        elif salary_max:
            return f"{currency} up to {salary_max:,}"

        return None

    def _build_description(self, job: dict, skills: list) -> str:
        """Build description dari job data"""
        parts = []

        # Job type (FULL_TIME, CONTRACT, etc)
        if job.get("type"):
            parts.append(f"Type: {job.get('type')}")

        # Education level
        if job.get("educationLevel"):
            parts.append(f"Education: {job.get('educationLevel')}")

        # Experience
        min_exp = job.get("minYearsOfExperience")
        max_exp = job.get("maxYearsOfExperience")
        if min_exp is not None or max_exp is not None:
            if min_exp and max_exp:
                parts.append(f"Experience: {min_exp}-{max_exp} years")
            elif min_exp:
                parts.append(f"Experience: {min_exp}+ years")

        # Skills
        if skills:
            parts.append(f"Skills: {', '.join(skills)}")

        # Industry
        company = job.get("company", {}) or {}
        industry = company.get("industry", {}) or {}
        if industry.get("name"):
            parts.append(f"Industry: {industry.get('name')}")

        return " | ".join(parts) if parts else None

    def _parse_job(self, job: dict, search_keyword: str = None) -> Optional[GlintsJob]:
        """Parse single job dari GraphQL response ke GlintsJob object"""
        try:
            # Extract company info
            company = job.get("company", {}) or {}
            company_name = company.get("name", "Unknown Company")
            company_id = company.get("id", "")
            company_url = (
                f"https://glints.com/id/companies/{company_id}" if company_id else None
            )

            # Extract location
            location_data = job.get("location", {}) or {}
            location_parts = []

            if location_data.get("formattedName"):
                location_parts.append(location_data.get("formattedName"))

            parents = location_data.get("parents", []) or []
            for parent in parents[:2]:
                if parent and parent.get("formattedName"):
                    location_parts.append(parent.get("formattedName"))

            location = ", ".join(location_parts) if location_parts else "Indonesia"

            if not location_parts:
                country = job.get("country", {}) or {}
                location = country.get("name", "Indonesia")

            # Extract salary
            salary_estimate = job.get("salaryEstimate", {}) or {}
            salary_min = salary_estimate.get("minAmount")
            salary_max = salary_estimate.get("maxAmount")
            salary_currency = salary_estimate.get(
                "currencyCode"
            ) or salary_estimate.get("CurrencyCode")

            if not salary_min:
                salaries = job.get("salaries", []) or []
                if salaries:
                    salary_min = salaries[0].get("minAmount")
                    salary_max = salaries[0].get("maxAmount")
                    salary_currency = salaries[0].get("currencyCode")

            salary = self._format_salary(salary_min, salary_max, salary_currency)

            # Extract skills
            skills = []
            for skill_item in job.get("skills", []) or []:
                if skill_item:
                    skill_detail = skill_item.get("skill", {}) or {}
                    skill_name = skill_detail.get("name")
                    if skill_name:
                        skills.append(skill_name)

            # Build job URL
            job_id = job.get("id", "")
            job_url = (
                f"https://glints.com/id/opportunities/jobs/{job_id}" if job_id else ""
            )

            # Map work arrangement to job_type
            work_arrangement = job.get("workArrangementOption")
            job_type = self._map_work_arrangement(work_arrangement)

            # Build description
            description = self._build_description(job, skills)

            # Format date
            date_posted = job.get("createdAt")
            if date_posted:
                # Keep just the date part
                date_posted = (
                    date_posted.split("T")[0] if "T" in date_posted else date_posted
                )

            return GlintsJob(
                id=f"glints_{job_id}",  # Prefix to avoid collision with LinkedIn IDs
                title=job.get("title", "Unknown Title"),
                company=company_name,
                company_url=company_url,
                location=location,
                salary=salary,
                date_posted=date_posted,
                job_url=job_url,
                description=description,
                job_type=job_type,
                search_keywords=search_keyword,
            )
        except Exception as e:
            print(f"Warning: Error parsing job: {e}")
            return None

    def _extract_jobs_from_response(
        self, data: dict, search_keyword: str = None
    ) -> list[GlintsJob]:
        """Extract jobs dari GraphQL response"""
        jobs = []

        try:
            search_data = data.get("data", {})
            search_jobs = search_data.get("searchJobsV3", {})
            jobs_in_page = search_jobs.get("jobsInPage", [])

            for job in jobs_in_page:
                parsed_job = self._parse_job(job, search_keyword)
                if parsed_job:
                    jobs.append(parsed_job)

            if jobs:
                print(f"   Extracted {len(jobs)} jobs from response")

        except Exception as e:
            print(f"Warning: Error extracting jobs: {e}")

        return jobs

    def scrape(
        self,
        keyword: str = "backend",
        location: str = "ID",
        max_scrolls: int = 10,
        scroll_delay: int = 2000,
    ) -> list[GlintsJob]:
        """
        Scrape jobs dari Glints

        Args:
            keyword: Kata kunci pencarian job
            location: Kode negara (ID, SG, VN, MY, TW, HK)
            max_scrolls: Jumlah scroll untuk load more jobs
            scroll_delay: Delay dalam ms setelah setiap scroll

        Returns:
            List of GlintsJob objects
        """
        all_jobs: list[GlintsJob] = []
        seen_ids = set()

        print(f"\nSearching Glints for: '{keyword}' in {location}")
        print("=" * 50)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)

            # Create context with or without auth
            import os

            context_options = {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }

            if self.auth_state and os.path.exists(self.auth_state):
                context_options["storage_state"] = self.auth_state
                print(f"Using auth state: {self.auth_state}")

            context = browser.new_context(**context_options)
            page = context.new_page()

            def handle_response(response):
                """Intercept GraphQL responses"""
                try:
                    if "graphql" in response.url and "searchJobsV3" in response.url:
                        if response.status == 200:
                            data = response.json()
                            if (
                                data.get("data", {})
                                .get("searchJobsV3", {})
                                .get("jobsInPage")
                            ):
                                jobs = self._extract_jobs_from_response(data, keyword)
                                for job in jobs:
                                    if job.id not in seen_ids:
                                        seen_ids.add(job.id)
                                        all_jobs.append(job)
                except Exception:
                    pass

            page.on("response", handle_response)

            url = f"{self.BASE_URL}?keyword={keyword}&country={location}"
            print(f"Navigating to: {url}")

            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(3000)

            print("Scrolling to load more jobs...")

            prev_count = 0
            no_new_jobs_count = 0

            for i in range(max_scrolls):
                page.mouse.wheel(0, 2000)
                page.wait_for_timeout(scroll_delay)

                current_count = len(all_jobs)
                print(f"   Scroll {i + 1}/{max_scrolls} - Total jobs: {current_count}")

                if current_count == prev_count:
                    no_new_jobs_count += 1
                    if no_new_jobs_count >= 3:
                        print("   No more jobs to load, stopping early")
                        break
                else:
                    no_new_jobs_count = 0

                prev_count = current_count

            browser.close()

        print("=" * 50)
        print(f"Total unique jobs scraped: {len(all_jobs)}")

        return all_jobs

    def scrape_to_dict(self, **kwargs) -> list[dict]:
        """Scrape dan return sebagai list of dictionaries"""
        jobs = self.scrape(**kwargs)
        return [job.to_db_dict() for job in jobs]

    def scrape_to_json(self, filename: str = None, **kwargs) -> str:
        """Scrape dan return sebagai JSON string, opsional save ke file"""
        jobs_dict = self.scrape_to_dict(**kwargs)
        json_str = json.dumps(jobs_dict, indent=2, ensure_ascii=False)

        if filename:
            with open(filename, "w", encoding="utf-8") as f:
                f.write(json_str)
            print(f"Saved to: {filename}")

        return json_str

    def scrape_and_store(self, **kwargs) -> tuple[int, int]:
        """
        Scrape jobs dan simpan ke database.

        Returns:
            Tuple of (new_jobs_count, updated_jobs_count)
        """
        from database import SessionLocal
        from models import Job, JobType

        jobs = self.scrape(**kwargs)

        if not jobs:
            return 0, 0

        db = SessionLocal()
        new_count = 0
        updated_count = 0

        try:
            for job in jobs:
                # Check if job already exists
                existing = db.query(Job).filter(Job.id == job.id).first()

                if existing:
                    # Update existing job
                    existing.title = job.title
                    existing.company = job.company
                    existing.company_url = job.company_url
                    existing.location = job.location
                    existing.salary = job.salary
                    existing.date_posted = job.date_posted
                    existing.job_url = job.job_url
                    existing.description = job.description
                    existing.job_type = JobType(job.job_type)
                    existing.search_keywords = job.search_keywords
                    updated_count += 1
                else:
                    # Create new job
                    db_job = Job(
                        id=job.id,
                        title=job.title,
                        company=job.company,
                        company_url=job.company_url,
                        location=job.location,
                        salary=job.salary,
                        date_posted=job.date_posted,
                        job_url=job.job_url,
                        description=job.description,
                        job_type=JobType(job.job_type),
                        search_keywords=job.search_keywords,
                    )
                    db.add(db_job)
                    new_count += 1

            db.commit()
            print(f"\nDatabase updated: {new_count} new, {updated_count} updated")

        except Exception as e:
            db.rollback()
            print(f"Error saving to database: {e}")
            raise
        finally:
            db.close()

        return new_count, updated_count


# ============================================================
# TESTING
# ============================================================
if __name__ == "__main__":
    import sys
    import os

    print("\n" + "=" * 60)
    print("GLINTS JOB SCRAPER - TEST MODE")
    print("=" * 60)

    # Check for --login flag
    if "--login" in sys.argv:
        scraper = GlintsScraper(headless=False)
        scraper.save_login_state()
        print("\nLogin complete! Now run without --login to scrape more jobs.")
        sys.exit(0)

    # Check for --store flag
    store_to_db = "--store" in sys.argv

    # Check if auth file exists
    auth_file = GlintsScraper.DEFAULT_AUTH_FILE
    if os.path.exists(auth_file):
        print(f"Found auth file: {auth_file}")
        scraper = GlintsScraper(headless=True, auth_state=auth_file)
    else:
        print("No auth file found. Running without login (limited to 30 jobs)")
        print("Run with --login flag to save your login session first.")
        scraper = GlintsScraper(headless=True)

    if store_to_db:
        # Scrape and store to database
        new_count, updated_count = scraper.scrape_and_store(
            keyword="backend",
            location="ID",
            max_scrolls=10,
            scroll_delay=2500,
        )
        print(f"\nStored to DB: {new_count} new jobs, {updated_count} updated")
    else:
        # Just scrape and display
        jobs = scraper.scrape(
            keyword="backend",
            location="ID",
            max_scrolls=10,
            scroll_delay=2500,
        )

        print("\n" + "=" * 60)
        print("SAMPLE RESULTS (First 5 jobs):")
        print("=" * 60)

        for i, job in enumerate(jobs[:5], 1):
            print(f"\n{i}. {job.title}")
            print(f"   Company: {job.company}")
            print(f"   Location: {job.location}")
            if job.salary:
                print(f"   Salary: {job.salary}")
            print(f"   Type: {job.job_type}")
            print(f"   URL: {job.job_url}")
            if job.description:
                print(f"   Info: {job.description[:100]}...")

    print("\nTest completed!")
