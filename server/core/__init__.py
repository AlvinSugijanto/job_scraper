"""
Core package - shared infrastructure
"""

from .websocket_manager import ConnectionManager, manager
from .database import engine, Base, get_db

__all__ = ["ConnectionManager", "manager", "engine", "Base", "get_db"]
