"""
Pydantic Schemas for Sessions.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SessionsBase(BaseModel):
    """Schema dasar untuk Sessions."""

    name: str = Field(min_length=1)
    status: str = Field(min_length=1)
    total_jobs: Optional[int] = None
    start_run_time: Optional[datetime] = None
    end_run_time: Optional[datetime] = None


class SessionsCreate(SessionsBase):
    """Schema untuk membuat Sessions baru."""

    pass


class SessionsUpdate(BaseModel):
    """Schema untuk mengubah Sessions secara parsial."""

    name: Optional[str] = None
    status: Optional[str] = None
    total_jobs: Optional[int] = None
    start_run_time: Optional[datetime] = None
    end_run_time: Optional[datetime] = None
