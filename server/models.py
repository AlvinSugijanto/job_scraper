"""
SQLAlchemy Models
"""

from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from datetime import datetime
import enum

from database import Base


class JobType(enum.Enum):
    """Enum for job work arrangement type."""

    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


def detect_job_type(text: str) -> JobType:
    """Detect job type from text content (description, title, etc.)."""
    if not text:
        return JobType.onsite

    text_lower = text.lower()

    # Check for remote keywords
    if "remote" in text_lower or "work from home" in text_lower or "wfh" in text_lower:
        return JobType.remote

    # Check for hybrid keywords
    if "hybrid" in text_lower:
        return JobType.hybrid

    # Default to onsite
    return JobType.onsite


class Job(Base):
    """Model untuk menyimpan data job dari LinkedIn."""

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    company_url = Column(String, nullable=True)
    location = Column(String, nullable=False)
    salary = Column(String, nullable=True)
    date_posted = Column(String, nullable=True)
    job_url = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    job_type = Column(SQLEnum(JobType), nullable=True, default=JobType.onsite)
    search_keywords = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert model to dictionary."""
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
            "job_type": self.job_type.value if self.job_type else "onsite",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
