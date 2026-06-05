"""
Service layer for banned keywords — business logic.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories import banned_keyword as banned_keyword_repo


def get_keywords(
    db: Session,
    search: str = None,
    sort_by: str = "keyword",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get paginated banned keywords."""
    keywords, total = banned_keyword_repo.get(
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
        "data": [k.to_dict() for k in keywords],
    }


def create_keyword(db: Session, keyword: str):
    """Create a new banned keyword. Raises HTTPException on duplicate."""
    existing = banned_keyword_repo.find(db, keyword)
    if existing:
        raise HTTPException(status_code=400, detail="Keyword already in banned list")

    db_keyword = banned_keyword_repo.create(db, keyword)
    return {"success": True, "data": db_keyword.to_dict()}


def delete_keyword(db: Session, keyword_id: int):
    """Delete a banned keyword. Raises HTTPException if not found."""
    db_keyword = banned_keyword_repo.delete(db, keyword_id)
    if not db_keyword:
        raise HTTPException(status_code=404, detail="Banned keyword not found")

    return {"success": True, "message": "Banned keyword deleted successfully"}
