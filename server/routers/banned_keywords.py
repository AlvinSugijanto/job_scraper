"""Banned Keywords routes."""

from fastapi import APIRouter, Query, Depends
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import BannedKeywordCreate, BannedKeywordUpdate
from services import banned_keyword as banned_keyword_service

router = APIRouter(
    prefix="/banned-keywords",
    tags=["banned-keywords"],
)


@router.get("")
def get(
    search: Optional[str] = Query(None, description="Search banned_keywords"),
    sort_by: Optional[str] = Query(
        "created_at", description="Sort by field: id, keyword, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        10, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    """Mendapatkan semua Banned Keywords dengan pagination."""
    return banned_keyword_service.get(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def create(body: BannedKeywordCreate, db: Session = Depends(get_db)):
    """Menambahkan Banned Keyword baru."""
    return banned_keyword_service.create(db, body.dict())


@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    """Menghapus Banned Keyword berdasarkan ID."""
    return banned_keyword_service.delete(db, id)


@router.put("/{id}")
def update(id: int, body: BannedKeywordCreate, db: Session = Depends(get_db)):
    """Mengubah data Banned Keyword yang sudah ada (Full Update)."""
    return banned_keyword_service.update(db, id, body.dict())


@router.patch("/{id}")
def patch(id: int, body: BannedKeywordUpdate, db: Session = Depends(get_db)):
    """Mengubah data Banned Keyword secara parsial (Partial Update)."""
    return banned_keyword_service.update(db, id, body.dict(exclude_unset=True))
