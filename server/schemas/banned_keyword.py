"""
Pydantic Schemas for Banned Keywords.
"""

from pydantic import BaseModel, Field


class BannedKeywordBase(BaseModel):
    """Schema dasar untuk Banned Keyword."""

    keyword: str = Field(min_length=1)


class BannedKeywordCreate(BannedKeywordBase):
    """Schema untuk membuat Banned Keyword baru."""

    pass
