"""
Repository for sessions — pure DB operations only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from typing import Optional
from datetime import datetime
from models.sessions import Sessions


def getAll(db: Session):
    """Get all sessions."""
    return db.query(Sessions).all()


def get(
    db: Session,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 10,
):
    """Get sessions with search, sort, and pagination."""
    query = db.query(Sessions)

    if search:
        query = query.filter(Sessions.name.ilike(f"%{search}%"))

    total = query.count()

    sort_column_map = {
        "id": Sessions.id,
        "name": Sessions.name,
        "status": Sessions.status,
        "total_jobs": Sessions.total_jobs,
        "start_run_time": Sessions.start_run_time,
        "end_run_time": Sessions.end_run_time,
        "created_at": Sessions.created_at,
    }
    sort_column = sort_column_map.get(sort_by, Sessions.created_at)
    order_func = desc if sort_order == "desc" else asc

    offset = (page - 1) * per_page
    records = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return records, total


def find(db: Session, name: str):
    """Find a Sessions by name (case-insensitive)."""
    return (
        db.query(Sessions)
        .filter(Sessions.name.ilike(name))
        .first()
    )


def create(db: Session, data: dict):
    """Create a new Sessions record."""
    db_sessions = Sessions(**data)
    db.add(db_sessions)
    db.commit()
    db.refresh(db_sessions)
    return db_sessions


def delete(db: Session, id: int):
    """Delete a Sessions by ID. Returns the record or None."""
    db_sessions = (
        db.query(Sessions)
        .filter(Sessions.id == id)
        .first()
    )
    if db_sessions:
        db.delete(db_sessions)
        db.commit()
    return db_sessions


def update(db: Session, id: int, data: dict):
    """Update a Sessions by ID. Returns the record or None."""
    db_sessions = (
        db.query(Sessions)
        .filter(Sessions.id == id)
        .first()
    )
    if db_sessions:
        for key, value in data.items():
            if hasattr(db_sessions, key):
                setattr(db_sessions, key, value)
        db.commit()
        db.refresh(db_sessions)
    return db_sessions
