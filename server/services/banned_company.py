"""
Service layer for banned companies — business logic.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories import banned_company as banned_company_repo


def get_companies(
    db: Session,
    search: str = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get paginated banned companies."""
    companies, total = banned_company_repo.get(
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
        "data": [c.to_dict() for c in companies],
    }


def create_company(db: Session, name: str):
    """Create a new banned company. Raises HTTPException on duplicate."""
    existing = banned_company_repo.find(db, name)
    if existing:
        raise HTTPException(status_code=400, detail="Company already in banned list")

    db_company = banned_company_repo.create(db, name)
    return {"success": True, "data": db_company.to_dict()}


def delete_company(db: Session, company_id: int):
    """Delete a banned company. Raises HTTPException if not found."""
    db_company = banned_company_repo.delete(db, company_id)
    if not db_company:
        raise HTTPException(status_code=404, detail="Banned company not found")

    return {"success": True, "message": "Banned company deleted successfully"}
