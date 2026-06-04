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
from routes.files import router as files_router
from routes.stream import router as stream_router

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
    missing = validate()
    if missing:
        logger.error(
            "missing environment variables: %s.  "
            "set them in backend/.env and restart.",
            ", ".join(missing),
        )
    else:
        logger.info("google drive oauth configured — ready")

    yield


# ------------------------------------------------------------------
# app
# ------------------------------------------------------------------

app = FastAPI(
    title="drive-pleya",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files_router)
app.include_router(stream_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
