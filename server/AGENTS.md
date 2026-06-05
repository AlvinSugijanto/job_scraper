# Backend Endpoint Development Rules & Architectural Patterns

When creating or modifying endpoints in this project, you MUST strictly follow this architecture and naming conventions.

## Folder & Layer Structure

The server uses a clean separation of concerns:
```
server/
├── models/         # SQLAlchemy DB Models
├── schemas/        # Pydantic Schemas for Validation
├── repositories/   # Pure Database Operations (Standardized CRUD)
├── services/       # Business Logic & Validation (FastAPI HTTPExceptions)
└── routers/        # Slim API Route Handlers
```

---

## 1. Models (`server/models/`)
- Define SQLAlchemy tables inheriting from `core.Base`.
- Implement a `to_dict(self)` method to convert instances into dictionary format.

**Example (`server/models/example.py`):**
```python
from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from core import Base

class ExampleModel(Base):
    __tablename__ = "list_example"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
```

---

## 2. Schemas (`server/schemas/`)
- Define Pydantic models for request/response validation.
- Separate base configurations, creation data transfer objects (DTOs), and responses.

**Example (`server/schemas/example.py`):**
```python
from pydantic import BaseModel

class ExampleBase(BaseModel):
    name: str

class ExampleCreate(ExampleBase):
    pass
```

---

## 3. Repositories (`server/repositories/`)
- **DB Operations only:** Never perform business checks, raise FastAPI HTTPExceptions, or check for duplicates in the repository layer.
- Keep the function signatures standardized:
  - `getAll(db: Session)`: Get all records (no pagination).
  - `get(db: Session, search: str = None, sort_by: str = "name", sort_order: str = "asc", page: int = 1, per_page: int = 10)`: Retrieve paginated list with filter, sort, and pagination. Returns `(records, total_count)`.
  - `find(db: Session, field: str)`: Fetch a single record (e.g. by unique key/name case-insensitive using `ilike`).
  - `create(db: Session, name: str)`: Insert new record into the DB.
  - `delete(db: Session, record_id: int)`: Delete record from the DB.

**Example (`server/repositories/example.py`):**
```python
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from models.example import ExampleModel

def getAll(db: Session):
    return db.query(ExampleModel).all()

def get(db: Session, search: str = None, sort_by: str = "name", sort_order: str = "asc", page: int = 1, per_page: int = 10):
    query = db.query(ExampleModel)
    if search:
        query = query.filter(ExampleModel.name.ilike(f"%{search}%"))
    total = query.count()
    sort_column = getattr(ExampleModel, sort_by, ExampleModel.name)
    order_func = desc if sort_order == "desc" else asc
    offset = (page - 1) * per_page
    records = query.order_by(order_func(sort_column)).offset(offset).limit(per_page).all()
    return records, total
```

---

## 4. Services (`server/services/`)
- Handles business logic, checks for duplication, and handles model conversion.
- **HTTPExceptions:** Only raise FastAPI `HTTPException` (e.g. `400 Bad Request` or `404 Not Found`) here, not in routers or repositories.

**Example (`server/services/example.py`):**
```python
from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories import example as example_repo

def get_examples(db: Session, search: str = None, sort_by: str = "name", sort_order: str = "asc", page: int = 1, per_page: int = 10):
    records, total = example_repo.get(db, search, sort_by, sort_order, page, per_page)
    return {
        "success": True,
        "total": total,
        "examples": [r.to_dict() for r in records]
    }

def create_example(db: Session, name: str):
    existing = example_repo.find(db, name)
    if existing:
        raise HTTPException(status_code=400, detail="Record already exists")
    db_record = example_repo.create(db, name)
    return {"success": True, "record": db_record.to_dict()}
```

---

## 5. Routers (`server/routers/`)
- Define HTTP routes and dependencies.
- Keep them **extremely slim**: simply validate input params, call the service layer, and return its output.
- **Swagger Documentation:** Always write a descriptive Indonesian docstring under the route function signature (e.g. `"""Mendapatkan semua..."""`). FastAPI will use this automatically as the endpoint's summary in Swagger.

**Example (`server/routers/example.py`):**
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from core import get_db
from schemas.example import ExampleCreate
from services import example as example_service

router = APIRouter(prefix="/examples", tags=["examples"])

@router.get("")
def get_examples(
    search: str = Query(None),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, alias="perPage"),
    db: Session = Depends(get_db)
):
    """Mendapatkan semua data contoh dengan pagination."""
    return example_service.get_examples(db, search, sort_by, sort_order, page, per_page)
```
