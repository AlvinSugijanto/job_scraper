"""
Service layer for banned_companies — business logic.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from repositories import banned_company as banned_company_repo


def get(
    db: Session,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get paginated banned_companies."""
    records, total = banned_company_repo.get(
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
    """Create a new Banned Company. Raises HTTPException on duplicate."""
    existing = banned_company_repo.find(db, data["name"])
    if existing:
        raise HTTPException(status_code=400, detail="Banned Company already exists")

    db_record = banned_company_repo.create(db, data)
    return {"success": True, "data": db_record.to_dict()}


def delete(db: Session, id: int):
    """Delete a Banned Company. Raises HTTPException if not found."""
    db_record = banned_company_repo.delete(db, id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Banned Company not found")

    return {"success": True, "message": "Banned Company deleted successfully"}


def update(db: Session, id: int, data: dict):
    """Update a Banned Company. Raises HTTPException on duplicate/not found."""
    if "name" in data:
        existing = banned_company_repo.find(db, data["name"])
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Banned Company already exists")

    db_record = banned_company_repo.update(db, id, data)
    if not db_record:
        raise HTTPException(status_code=404, detail="Banned Company not found")

    return {"success": True, "data": db_record.to_dict()}
