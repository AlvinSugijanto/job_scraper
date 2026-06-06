"""
Repository for banned_keywords — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from typing import Optional
from models.banned_keyword import BannedKeyword


def getAll(db: Session):
    """Get all banned_keywords."""
    return db.query(BannedKeyword).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get banned_keywords with search, sort, and pagination."""
    query = db.query(BannedKeyword)

    if search:
        query = query.filter(BannedKeyword.keyword.ilike(f"%{search}%"))

    total = query.count()

    sort_column_map = {
        "id": BannedKeyword.id,
        "keyword": BannedKeyword.keyword,
        "created_at": BannedKeyword.created_at,
    }
    sort_column = sort_column_map.get(sort_by, BannedKeyword.created_at)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    records = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return records, total


def find(db: Session, keyword: str):
    """Find a Banned Keyword by keyword (case-insensitive)."""
    return (
        db.query(BannedKeyword)
        .filter(BannedKeyword.keyword.ilike(keyword))
        .first()
    )


def create(db: Session, data: dict):
    """Create a new Banned Keyword record."""
    db_banned_keyword = BannedKeyword(**data)
    db.add(db_banned_keyword)
    db.commit()
    db.refresh(db_banned_keyword)
    return db_banned_keyword


def delete(db: Session, id: int):
    """Delete a Banned Keyword by ID. Returns the record or None."""
    db_banned_keyword = (
        db.query(BannedKeyword)
        .filter(BannedKeyword.id == id)
        .first()
    )
    if db_banned_keyword:
        db.delete(db_banned_keyword)
        db.commit()
    return db_banned_keyword


def update(db: Session, id: int, data: dict):
    """Update a Banned Keyword by ID. Returns the record or None."""
    db_banned_keyword = (
        db.query(BannedKeyword)
        .filter(BannedKeyword.id == id)
        .first()
    )
    if db_banned_keyword:
        for key, value in data.items():
            if hasattr(db_banned_keyword, key):
                setattr(db_banned_keyword, key, value)
        db.commit()
        db.refresh(db_banned_keyword)
    return db_banned_keyword
