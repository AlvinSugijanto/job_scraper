"""
Repository for banned keywords — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from models.banned_keyword import BannedKeyword


def getAll(db: Session):
    """Get all banned keywords."""
    return db.query(BannedKeyword).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "keyword",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get banned keywords with search, sort, and pagination."""
    query = db.query(BannedKeyword)

    if search:
        query = query.filter(BannedKeyword.keyword.ilike(f"%{search}%"))

    total = query.count()

    sort_column_map = {
        "keyword": BannedKeyword.keyword,
        "created_at": BannedKeyword.created_at,
    }
    sort_column = sort_column_map.get(sort_by, BannedKeyword.keyword)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    keywords = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return keywords, total


def find(db: Session, keyword: str):
    """Find a banned keyword by value (case-insensitive)."""
    return (
        db.query(BannedKeyword)
        .filter(BannedKeyword.keyword.ilike(keyword))
        .first()
    )


def create(db: Session, keyword: str):
    """Create a new banned keyword record."""
    db_keyword = BannedKeyword(keyword=keyword)
    db.add(db_keyword)
    db.commit()
    db.refresh(db_keyword)
    return db_keyword


def delete(db: Session, keyword_id: int):
    """Delete a banned keyword by ID. Returns the record or None."""
    db_keyword = (
        db.query(BannedKeyword)
        .filter(BannedKeyword.id == keyword_id)
        .first()
    )
    if db_keyword:
        db.delete(db_keyword)
        db.commit()
    return db_keyword
