"""
WebSocket Connection Manager for real-time progress updates
"""

from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for scraping progress updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_progress(self, client_id: str, data: dict):
        """Send progress update to a specific client."""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(data)
            except Exception:
                self.disconnect(client_id)

    async def send_started(self, client_id: str, message: str = "Starting scrape..."):
        await self.send_progress(client_id, {"type": "started", "message": message})

    async def send_fetching_page(self, client_id: str, page: int, jobs_found: int):
        await self.send_progress(
            client_id, {"type": "fetching_page", "page": page, "jobs_found": jobs_found}
        )

    async def send_rate_limit(self, client_id: str, wait_seconds: int):
        await self.send_progress(
            client_id,
            {
                "type": "rate_limit",
                "wait_seconds": wait_seconds,
                "message": f"Rate limited, waiting {wait_seconds}s...",
            },
        )

    async def send_parsing(self, client_id: str, current: int, total: int):
        await self.send_progress(
            client_id, {"type": "parsing", "current": current, "total": total}
        )

    async def send_completed(self, client_id: str, total_jobs: int, new_jobs: int):
        await self.send_progress(
            client_id,
            {
                "type": "completed",
                "total_jobs": total_jobs,
                "new_jobs": new_jobs,
                "message": f"Completed! Found {total_jobs} jobs ({new_jobs} new)",
            },
        )

    async def send_error(self, client_id: str, message: str):
        await self.send_progress(client_id, {"type": "error", "message": message})


# Global instance
manager = ConnectionManager()
