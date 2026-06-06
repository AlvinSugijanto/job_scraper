"""
Pydantic Schemas for Banned Companies.
"""

from pydantic import BaseModel, Field
from typing import Optional


class BannedCompanyBase(BaseModel):
    """Schema dasar untuk Banned Company."""

    name: str = Field(min_length=1)


class BannedCompanyCreate(BannedCompanyBase):
    """Schema untuk membuat Banned Company baru."""

    pass


class BannedCompanyUpdate(BaseModel):
    """Schema untuk mengubah Banned Company secara parsial."""

    name: Optional[str] = None
