"""
Video streaming endpoint.

Uses the service account's OAuth access token to fetch video bytes from
Google Drive.  Redirect mode is no longer supported (access tokens are
short-lived and must not be exposed in URLs).
"""

import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from services.drive_client import drive_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stream"])

CHUNK_SIZE = 64 * 1024  # 64 KB


@router.get("/files/{file_id}/stream")
async def stream_video(file_id: str, request: Request):
    """Stream a video from Google Drive via the backend proxy.

    Uses the service account access token for authentication.
    Supports HTTP range requests for seeking.
    """
    import httpx

    try:
        access_token = drive_client.get_access_token()
    except Exception:
        logger.exception("failed to obtain drive access token")
        raise HTTPException(status_code=502, detail="drive auth error")

    url = (
        "https://www.googleapis.com/drive/v3/files/"
        f"{file_id}?alt=media"
    )

    headers: dict[str, str] = {
        "Authorization": f"Bearer {access_token}",
    }
    range_header = request.headers.get("range", "")
    if range_header:
        headers["Range"] = range_header

    async def _stream():
        """Pull chunks from Drive and yield them to the client."""
        async with httpx.AsyncClient(timeout=httpx.Timeout(600)) as client:
            async with client.stream("GET", url, headers=headers) as resp:
                if resp.status_code >= 400:
                    logger.warning("drive stream error %d on %s",
                                   resp.status_code, file_id)
                    return
                async for chunk in resp.aiter_bytes(CHUNK_SIZE):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
        },
    )
