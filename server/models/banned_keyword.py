"""
SQLAlchemy model for banned keywords.
"""

from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime
from core import Base


class BannedKeyword(Base):
    """Table to store keywords whose jobs should be filtered out based on description."""

    __tablename__ = "list_banned_keywords"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    keyword = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "keyword": self.keyword,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
