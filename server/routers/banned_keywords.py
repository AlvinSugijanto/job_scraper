from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session

from core import get_db
from schemas import BannedKeywordCreate
from services import banned_keyword as banned_keyword_service

router = APIRouter(
    prefix="/banned-keywords",
    tags=["banned-keywords"],
)


@router.get("")
def get_banned_keywords(
    search: Optional[str] = Query(None, description="Search by keyword value"),
    sort_by: Optional[str] = Query(
        "keyword", description="Sort by field: keyword, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=10000, alias="perPage", description="Items per page"),
    db: Session = Depends(get_db),
):
    """Mendapatkan semua banned keywords dengan pagination."""
    return banned_keyword_service.get_keywords(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def add_banned_keyword(keyword_in: BannedKeywordCreate, db: Session = Depends(get_db)):
    """Menambahkan keyword baru ke dalam daftar banned list."""
    return banned_keyword_service.create_keyword(db, keyword_in.keyword)


@router.delete("/{keyword_id}")
def delete_banned_keyword(keyword_id: int, db: Session = Depends(get_db)):
    """Menghapus keyword dari daftar banned list berdasarkan ID."""
    return banned_keyword_service.delete_keyword(db, keyword_id)
