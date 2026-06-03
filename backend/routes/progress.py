"""
Watch-progress endpoints.

Reads are served from the in-memory store.
Writes are debounced (30 s) unless ``?immediate=true`` is passed.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.progress_store import progress_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["progress"])


# ------------------------------------------------------------------
# request model
# ------------------------------------------------------------------

class ProgressUpdate(BaseModel):
    position: float = Field(..., ge=0, description="current playback position in seconds")
    duration: float = Field(..., gt=0, description="total video duration in seconds")


# ------------------------------------------------------------------
# endpoints
# ------------------------------------------------------------------

@router.get("/progress")
async def get_all_progress():
    """Return watch progress for every video."""
    return {"videos": progress_store.get_all()}


@router.get("/progress/{file_id}")
async def get_progress(file_id: str):
    """Return watch progress for a single video."""
    entry = progress_store.get(file_id)
    if entry is None:
        return {"position": 0, "duration": 0, "percentage": 0,
                "completed": False, "lastUpdated": None}
    return entry


@router.post("/progress/{file_id}")
async def update_progress(
    file_id: str,
    body: ProgressUpdate,
    immediate: bool = Query(False),
):
    """Save watch progress for a video.

    Query params:
        immediate  – write to Drive immediately (use on pause / unload)
    """
    try:
        entry = await progress_store.update(
            file_id, body.position, body.duration, immediate=immediate
        )
        return entry
    except Exception:
        logger.exception("failed to update progress for %s", file_id)
        raise HTTPException(status_code=502, detail="failed to save progress")


@router.delete("/progress/{file_id}")
async def delete_progress(file_id: str):
    """Reset watch progress for a video."""
    existed = await progress_store.delete(file_id)
    if not existed:
        raise HTTPException(status_code=404, detail="no progress for this file")
    return {"status": "deleted"}
