"""
Service layer for banned_keywords — business logic.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from repositories import banned_keyword as banned_keyword_repo


def get(
    db: Session,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get paginated banned_keywords."""
    records, total = banned_keyword_repo.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )
    return {
        "success": True,
        "total": total,
        "data": [r.to_dict() for r in records],
    }


def create(db: Session, data: dict):
    """Create a new Banned Keyword. Raises HTTPException on duplicate."""
    existing = banned_keyword_repo.find(db, data["keyword"])
    if existing:
        raise HTTPException(status_code=400, detail="Banned Keyword already exists")

    db_record = banned_keyword_repo.create(db, data)
    return {"success": True, "data": db_record.to_dict()}


def delete(db: Session, id: int):
    """Delete a Banned Keyword. Raises HTTPException if not found."""
    db_record = banned_keyword_repo.delete(db, id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Banned Keyword not found")

    return {"success": True, "message": "Banned Keyword deleted successfully"}


def update(db: Session, id: int, data: dict):
    """Update a Banned Keyword. Raises HTTPException on duplicate/not found."""
    if "keyword" in data:
        existing = banned_keyword_repo.find(db, data["keyword"])
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Banned Keyword already exists")

    db_record = banned_keyword_repo.update(db, id, data)
    if not db_record:
        raise HTTPException(status_code=404, detail="Banned Keyword not found")

    return {"success": True, "data": db_record.to_dict()}
