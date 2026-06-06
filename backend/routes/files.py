"""
File-listing endpoints.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from services.drive_client import drive_client
from services.file_cache import FileCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["files"])
_files_cache = FileCache(ttl_seconds=300)   # cache listings for 5 min
_thumbnail_cache = FileCache(ttl_seconds=3600)  # cache thumbnails for 1 hour


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

    # sort alphabetically (case-insensitive)
    folders.sort(key=lambda f: f["name"].lower())
    files.sort(key=lambda f: f["name"].lower())

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


@router.get("/files/{file_id}/thumbnail")
async def get_thumbnail(file_id: str):
    """Proxy a file's thumbnail from Google Drive (uses OAuth so it always works)."""
    import httpx

    cache_key = f"thumb:{file_id}"
    raw = _thumbnail_cache.get(cache_key)
    if isinstance(raw, dict):
        return Response(content=raw["body"], media_type=str(raw["mime"]))

    try:
        file_meta = drive_client.get_file(file_id)
        thumbnail_url = file_meta.get("thumbnailLink")
        if not thumbnail_url:
            raise HTTPException(status_code=404, detail="no thumbnail available")

        token = drive_client.get_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(timeout=httpx.Timeout(15)) as client:
            resp = await client.get(str(thumbnail_url), headers=headers)
            if resp.status_code >= 400:
                raise HTTPException(status_code=502, detail="thumbnail fetch failed")

        content_type = resp.headers.get("content-type", "image/jpeg")
        body: bytes = resp.content
        _thumbnail_cache.set(cache_key, {"body": body, "mime": content_type})
        return Response(content=body, media_type=content_type)

    except HTTPException:
        raise
    except Exception:
        logger.exception("thumbnail proxy failed for %s", file_id)
        raise HTTPException(status_code=502, detail="thumbnail fetch failed")


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
