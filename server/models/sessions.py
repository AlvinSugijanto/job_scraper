"""
SQLAlchemy model for job scraping sessions.
"""

from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime
from core import Base


class Sessions(Base):
    """Table to store job scraping sessions."""

    __tablename__ = "list_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    status = Column(String, unique=False, nullable=False)
    total_jobs = Column(Integer, unique=False, nullable=True, default=0)
    start_run_time = Column(DateTime, nullable=True)
    end_run_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "total_jobs": self.total_jobs,
            "start_run_time": self.start_run_time.isoformat()
            if self.start_run_time
            else None,
            "end_run_time": self.end_run_time.isoformat()
            if self.end_run_time
            else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
