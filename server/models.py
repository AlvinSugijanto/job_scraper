"""
SQLAlchemy Models
"""

from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime

from database import Base


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
        }
