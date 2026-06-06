"""
Repository for banned companies — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from models.banned_company import BannedCompany


def getAll(db: Session):
    """Get all banned companies."""
    return db.query(BannedCompany).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get banned companies with search, sort, and pagination."""
    query = db.query(BannedCompany)

    if search:
        query = query.filter(BannedCompany.name.ilike(f"%{search}%"))

    total = query.count()

    sort_column_map = {
        "name": BannedCompany.name,
        "created_at": BannedCompany.created_at,
    }
    sort_column = sort_column_map.get(sort_by, BannedCompany.name)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    companies = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return companies, total


def find(db: Session, name: str):
    """Find a banned company by name (case-insensitive)."""
    return (
        db.query(BannedCompany)
        .filter(BannedCompany.name.ilike(name))
        .first()
    )


def create(db: Session, name: str):
    """Create a new banned company record."""
    db_company = BannedCompany(name=name)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def delete(db: Session, company_id: int):
    """Delete a banned company by ID. Returns the record or None."""
    db_company = (
        db.query(BannedCompany)
        .filter(BannedCompany.id == company_id)
        .first()
    )
    if db_company:
        db.delete(db_company)
        db.commit()
    return db_company


def update(db: Session, company_id: int, name: str):
    """Update a banned company by ID. Returns the record or None."""
    db_company = (
        db.query(BannedCompany)
        .filter(BannedCompany.id == company_id)
        .first()
    )
    if db_company:
        db_company.name = name
        db.commit()
        db.refresh(db_company)
    return db_company
