"""
SQLAlchemy model for banned companies.
"""

from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime
from core import Base


class BannedCompany(Base):
    """Table to store names of companies whose jobs should be filtered out."""

    __tablename__ = "list_banned_company"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
