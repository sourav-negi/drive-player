"""
File-listing endpoints.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from services.drive_client import drive_client
from services.file_cache import FileCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["files"])
_files_cache = FileCache(ttl_seconds=300)   # cache listings for 5 min


@router.get("/files")
async def list_files(folder_id: str | None = Query(None)):
    """
    List all video files (and folders) on Google Drive.

    Query params:
        folder_id  – scope to a specific folder (default: scanned root)
    """
    cache_key = f"files:{folder_id or 'root'}"
    cached = _files_cache.get(cache_key)
    if cached:
        return cached

    try:
        files = await _fetch_files(folder_id)
        folders = await _fetch_folders(folder_id)
    except Exception as exc:
        logger.exception("failed to list files from drive")
        raise HTTPException(status_code=502, detail="drive connection error")

    result = {"folders": folders, "files": files}
    _files_cache.set(cache_key, result)
    return result


@router.get("/files/{file_id}")
async def get_file(file_id: str):
    """Return metadata for a single file."""
    try:
        return drive_client.get_file(file_id)
    except Exception as exc:
        logger.exception("failed to get file %s", file_id)
        raise HTTPException(status_code=404, detail="file not found")


# ------------------------------------------------------------------
# helpers
# ------------------------------------------------------------------

async def _fetch_files(folder_id: str | None) -> list[dict]:
    """Run the (blocking) Drive API file listing in a thread."""
    import asyncio
    return await asyncio.to_thread(drive_client.list_video_files, folder_id)


async def _fetch_folders(folder_id: str | None) -> list[dict]:
    """Run the (blocking) Drive API folder listing in a thread."""
    import asyncio
    return await asyncio.to_thread(drive_client.list_folders, folder_id)
