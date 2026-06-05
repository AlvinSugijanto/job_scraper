"""
LinkedIn Job Scraper API
"""

import logging
from logging.handlers import RotatingFileHandler

# Configure logging to console and scraper.log file with precise date/time
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s",
    handlers=[
        RotatingFileHandler(
            "scraper.log", maxBytes=10 * 1024 * 1024, backupCount=3, encoding="utf-8"
        ),
        logging.StreamHandler(),
    ],
    force=True,
)
logger = logging.getLogger(__name__)
logger.info("LinkedIn Job Scraper API starting up...")


from scraper import search_jobs_kalibrr
from scraper import search_jobs_jobstreet
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio

from scraper import search_jobs_linkedin
from core import engine, get_db, Base
from core import manager
from schemas import WebSocketSearchRequest
from services import job as job_service
from routers import job_router, banned_companies_router, banned_keywords_router

# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LinkedIn Job Scraper API",
    description="API untuk mencari lowongan kerja dari LinkedIn",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ ROUTERS ============

app.include_router(job_router)
app.include_router(banned_companies_router)
app.include_router(banned_keywords_router)


# ============ ROUTES ============


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "LinkedIn Job Scraper API",
        "docs": "/docs",
    }


# ============ WEBSOCKET ROUTES ============


@app.websocket("/ws/scrape/{client_id}")
async def websocket_scrape(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time scraping progress.

    Client sends search params, server streams progress updates.
    """
    await manager.connect(client_id, websocket)

    # Get database session
    db = next(get_db())

    try:
        # Wait for search request from client
        data = await websocket.receive_json()
        request = WebSocketSearchRequest(**data)

        # Notify: started
        await manager.send_started(client_id, f"Searching for '{request.keywords}'...")

        # Background task to listen for cancellation from client
        async def listen_for_cancel():
            try:
                while True:
                    msg = await websocket.receive_json()
                    if msg.get("action") == "cancel":
                        manager.cancel(client_id)
                        break
            except Exception:
                manager.cancel(client_id)

        cancel_task = asyncio.create_task(listen_for_cancel())

        # Get existing IDs
        existing_ids = job_service.get_existing_ids(db)

        # Map portal key → scraper function
        portal_scrapers = {
            "linkedin": search_jobs_linkedin,
            "jobstreet": search_jobs_jobstreet,
            "kalibrr": search_jobs_kalibrr,
        }

        # Filter only valid & selected portals
        portals = [p for p in (request.job_portals or []) if p in portal_scrapers]
        if not portals:
            portals = ["linkedin"]  # fallback

        # Run selected scrapers concurrently
        tasks = [
            portal_scrapers[portal](
                request=request,
                existing_ids=existing_ids,
                manager=manager,
                client_id=client_id,
            )
            for portal in portals
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        # Stop listening for cancel
        cancel_task.cancel()

        # Merge results, skip any that errored
        all_jobs = []
        for result in results:
            if isinstance(result, Exception):
                await manager.send_error(client_id, str(result))
            else:
                all_jobs.extend(result)

        # Save to database
        new_count = job_service.save_scraped_jobs(db, all_jobs, request.keywords)

        # Notify: completed
        await manager.send_completed(client_id, len(all_jobs), new_count)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await manager.send_error(client_id, str(e))
    finally:
        manager.disconnect(client_id)
        db.close()


# ============ RUN ============

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
