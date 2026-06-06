"""Sessions routes."""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import SessionsCreate, SessionsUpdate
from services import sessions as sessions_service

router = APIRouter(
    prefix="/sessions",
    tags=["sessions"],
)


@router.get("")
def get(
    search: Optional[str] = Query(None, description="Search sessions"),
    sort_by: Optional[str] = Query(
        "created_at", description="Sort by field: id, name, status, total_jobs, start_run_time, end_run_time, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        10, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    """Mendapatkan semua Sessions dengan pagination."""
    return sessions_service.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def create(body: SessionsCreate, db: Session = Depends(get_db)):
    """Menambahkan Sessions baru."""
    return sessions_service.create(db, body.dict())


@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    """Menghapus Sessions berdasarkan ID."""
    return sessions_service.delete(db, id)


@router.put("/{id}")
def update(id: int, body: SessionsCreate, db: Session = Depends(get_db)):
    """Mengubah data Sessions yang sudah ada (Full Update)."""
    return sessions_service.update(db, id, body.dict())


@router.patch("/{id}")
def patch(id: int, body: SessionsUpdate, db: Session = Depends(get_db)):
    """Mengubah data Sessions secara parsial (Partial Update)."""
    return sessions_service.update(db, id, body.dict(exclude_unset=True))
