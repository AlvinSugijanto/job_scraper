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
def get(
    search: Optional[str] = Query(None, description="Search by keyword value"),
    sort_by: Optional[str] = Query(
        "keyword", description="Sort by field: keyword, created_at"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(
        10, ge=1, le=10000, alias="perPage", description="Items per page"
    ),
    db: Session = Depends(get_db),
):
    """GET /api/v1/banned-keywords"""
    return banned_keyword_service.get_keywords(
        db,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.post("")
def create(keyword_in: BannedKeywordCreate, db: Session = Depends(get_db)):
    """POST /api/v1/banned-keywords"""
    return banned_keyword_service.create_keyword(db, keyword_in.keyword)


@router.delete("/{keyword_id}")
def delete(keyword_id: int, db: Session = Depends(get_db)):
    """DELETE /api/v1/banned-keywords/{keyword_id}"""
    return banned_keyword_service.delete_keyword(db, keyword_id)
