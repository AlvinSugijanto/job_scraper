"""Banned companies routes."""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import BannedCompanyCreate
from services import banned_company as banned_company_service

router = APIRouter(
    prefix="/banned-companies",
    tags=["banned-companies"],
)


@router.get("")
def get_banned_companies(
    search: Optional[str] = Query(None, description="Search by company name"),
    sort_by: Optional[str] = Query(
        "name", description="Sort by field: name, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=10000, alias="perPage", description="Items per page"),
    db: Session = Depends(get_db),
):
    """Mendapatkan semua banned companies dengan pagination."""

    return banned_company_service.get_companies(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def add_banned_company(company: BannedCompanyCreate, db: Session = Depends(get_db)):
    """Menambahkan company baru ke dalam daftar banned list."""
    return banned_company_service.create_company(db, company.name)


@router.delete("/{company_id}")
def delete_banned_company(company_id: int, db: Session = Depends(get_db)):
    """Menghapus company dari daftar banned list berdasarkan ID."""
    return banned_company_service.delete_company(db, company_id)
