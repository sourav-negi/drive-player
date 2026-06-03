"""
drive-pleya — personal video streaming from Google Drive.

Entry point.  Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, validate
from services.progress_store import progress_store
from routes.files import router as files_router
from routes.stream import router as stream_router
from routes.progress import router as progress_router

# ------------------------------------------------------------------
# logging
# ------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
)
logger = logging.getLogger("drive-pleya")

# ------------------------------------------------------------------
# lifespan
# ------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    # --- startup -----------------------------------------------------------
    missing = validate()
    if missing:
        logger.error(
            "missing environment variables: %s.  "
            "set them in backend/.env and restart.",
            ", ".join(missing),
        )
    else:
        logger.info("google drive credentials found")

    try:
        await progress_store.initialize()
        logger.info("progress store ready")
    except Exception:
        logger.warning(
            "could not initialise progress store (drive may be unreachable).  "
            "progress tracking will start fresh when drive becomes available."
        )

    yield  # --- app runs here ----------------------------------------------

    # --- shutdown ----------------------------------------------------------
    logger.info("shutting down – flushing progress ...")
    try:
        await progress_store.flush()
    except Exception:
        logger.exception("failed to flush progress on shutdown")


# ------------------------------------------------------------------
# app
# ------------------------------------------------------------------

app = FastAPI(
    title="drive-pleya",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS ------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- routers ---------------------------------------------------------------

app.include_router(files_router)
app.include_router(stream_router)
app.include_router(progress_router)


# --- health ----------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok"}
