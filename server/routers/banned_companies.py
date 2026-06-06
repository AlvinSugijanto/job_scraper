"""Banned Companies routes."""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import BannedCompanyCreate, BannedCompanyUpdate
from services import banned_company as banned_company_service

router = APIRouter(
    prefix="/banned-companies",
    tags=["banned-companies"],
)


@router.get("")
def get(
    search: Optional[str] = Query(None, description="Search banned_companies"),
    sort_by: Optional[str] = Query(
        "created_at", description="Sort by field: id, name, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        10, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    """Mendapatkan semua Banned Companies dengan pagination."""
    return banned_company_service.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def create(body: BannedCompanyCreate, db: Session = Depends(get_db)):
    """Menambahkan Banned Company baru."""
    return banned_company_service.create(db, body.dict())


@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    """Menghapus Banned Company berdasarkan ID."""
    return banned_company_service.delete(db, id)


@router.put("/{id}")
def update(id: int, body: BannedCompanyCreate, db: Session = Depends(get_db)):
    """Mengubah data Banned Company yang sudah ada (Full Update)."""
    return banned_company_service.update(db, id, body.dict())


@router.patch("/{id}")
def patch(id: int, body: BannedCompanyUpdate, db: Session = Depends(get_db)):
    """Mengubah data Banned Company secara parsial (Partial Update)."""
    return banned_company_service.update(db, id, body.dict(exclude_unset=True))
