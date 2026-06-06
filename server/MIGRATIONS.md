# Database Migrations & Schema Management

This document explains how database schemas and tables are managed, created, and updated in this project.

---

## 1. How Table Creation Works

The project uses **SQLite** as the database (stored at `server/jobs.db`) and **SQLAlchemy** as the ORM.

Instead of running traditional migration scripts (like Alembic), the application uses **SQLAlchemy Schema Auto-Creation** on startup.

Inside [main.py](file:///c:/Users/alvin/my-project/linkedin-scaper-api/server/main.py), the following line executes when the FastAPI server boots up:
```python
# Create tables
Base.metadata.create_all(bind=engine)
```

This command automatically inspects all models imported into the application metadata and creates their respective tables in the SQLite database if they do not already exist.

---

## 2. Steps to Add a New Table / Entity

To add a completely new table to the database, follow these steps:

### Step 1: Create the SQLAlchemy Model
Create a new file in `server/models/` (e.g., `server/models/sessions.py`) inheriting from `core.Base`.
Example:
```python
from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from core import Base

class Sessions(Base):
    __tablename__ = "list_sessions"

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

### Step 2: Register the Model
Import and add your model class in [models/\_\_init\_\_.py]
```python
from .sessions import Sessions
__all__ = ["Job", "BannedCompany", "BannedKeyword", "Sessions"]
```

### Step 3: Scaffold the CRUD Layers
Run the CLI scaffolding script to auto-generate routers, schemas, services, and repositories:
```bash
venv/Scripts/python.exe generate_crud.py Sessions
```

### Step 4: Boot the Server
Restart the FastAPI server (or let it auto-reload). SQLAlchemy will detect the new model and automatically execute `CREATE TABLE` for it in the database.

---

## 3. Handling Schema Changes (Adding/Modifying Columns)

SQLAlchemy's `Base.metadata.create_all()` will **only** create tables that do not already exist. It **does not automatically alter** existing tables to add, remove, or modify columns.

If you update an existing model (e.g. adding a new column in `Job` or `Sessions`), use one of the following methods to apply the changes:

### Method A: Reset the Database (Easiest for Development)
If you do not mind clearing your local development data:
1. Stop the backend server.
2. Delete the `server/jobs.db` file.
3. Start the server. SQLAlchemy will recreate the entire database and all tables with the updated schema columns.

### Method B: Manual Alteration (Preserves Data)
If you want to keep your data, manually run an SQL command against the database:
1. Open `server/jobs.db` using an SQLite client (e.g., [DB Browser for SQLite](https://sqlitebrowser.org/) or the `sqlite3` command line).
2. Execute an `ALTER TABLE` statement. For example:
   ```sql
   ALTER TABLE list_sessions ADD COLUMN status VARCHAR;
   ```
3. Save/write changes to the database.

---

## 4. Introducing Alembic (For Production/Version-Controlled Migrations)

If this project moves to production or requires strict, incremental database versioning, you can integrate **Alembic**.

### How to Set Up Alembic:
1. Install Alembic inside your virtual environment:
   ```bash
   pip install alembic
   ```
2. Initialize Alembic:
   ```bash
   alembic init alembic
   ```
3. Configure `alembic.ini` to use the SQLite database URL:
   ```ini
   sqlalchemy.url = sqlite:///./jobs.db
   ```
4. Configure `alembic/env.py` to target the metadata of your SQLAlchemy models:
   ```python
   from core import Base
   # Import all models here to register them with metadata
   import models 
   target_metadata = Base.metadata
   ```
5. Generate an automatic migration script whenever you change models:
   ```bash
   alembic revision --autogenerate -m "add status to sessions"
   ```
6. Apply migrations to the database:
   ```bash
   alembic upgrade head
   ```
