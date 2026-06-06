"""
Repository for banned_companies — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from typing import Optional
from models.banned_company import BannedCompany


def getAll(db: Session):
    """Get all banned_companies."""
    return db.query(BannedCompany).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get banned_companies with search, sort, and pagination."""
    query = db.query(BannedCompany)

    if search:
        query = query.filter(BannedCompany.name.ilike(f"%{search}%"))

    total = query.count()

    sort_column_map = {
        "id": BannedCompany.id,
        "name": BannedCompany.name,
        "created_at": BannedCompany.created_at,
    }
    sort_column = sort_column_map.get(sort_by, BannedCompany.created_at)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    records = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return records, total


def find(db: Session, name: str):
    """Find a Banned Company by name (case-insensitive)."""
    return (
        db.query(BannedCompany)
        .filter(BannedCompany.name.ilike(name))
        .first()
    )


def create(db: Session, data: dict):
    """Create a new Banned Company record."""
    db_banned_company = BannedCompany(**data)
    db.add(db_banned_company)
    db.commit()
    db.refresh(db_banned_company)
    return db_banned_company


def delete(db: Session, id: int):
    """Delete a Banned Company by ID. Returns the record or None."""
    db_banned_company = (
        db.query(BannedCompany)
        .filter(BannedCompany.id == id)
        .first()
    )
    if db_banned_company:
        db.delete(db_banned_company)
        db.commit()
    return db_banned_company


def update(db: Session, id: int, data: dict):
    """Update a Banned Company by ID. Returns the record or None."""
    db_banned_company = (
        db.query(BannedCompany)
        .filter(BannedCompany.id == id)
        .first()
    )
    if db_banned_company:
        for key, value in data.items():
            if hasattr(db_banned_company, key):
                setattr(db_banned_company, key, value)
        db.commit()
        db.refresh(db_banned_company)
    return db_banned_company
