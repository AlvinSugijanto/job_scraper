"""
SQLAlchemy Models
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from enums import JobContractType, JobType
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from datetime import datetime

from core import Base


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
    job_contract = Column(
        SQLEnum(JobContractType), nullable=True, default=JobContractType.full_time
    )
    search_keywords = Column(String, nullable=True)
    source = Column(String, nullable=True)
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
            "job_type": self.job_type.value if self.job_type else None,
            "job_contract": self.job_contract.value if self.job_contract else None,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
