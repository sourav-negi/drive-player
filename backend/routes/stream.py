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
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=httpx.Timeout(600))
    try:
        req = client.build_request("GET", url, headers=headers)
        resp = await client.send(req, stream=True)
        if resp.status_code >= 400:
            logger.warning("drive stream error %d on %s", resp.status_code, file_id)
            await resp.aclose()
            await client.aclose()
            raise HTTPException(status_code=resp.status_code, detail="Drive stream error")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        logger.exception("failed to initiate stream to drive")
        await client.aclose()
        raise HTTPException(status_code=502, detail="failed to connect to drive")

    async def _stream():
        """Pull chunks from Drive and yield them to the client."""
        try:
            async for chunk in resp.aiter_bytes(CHUNK_SIZE):
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    response_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
    }
    if "content-range" in resp.headers:
        response_headers["Content-Range"] = resp.headers["content-range"]
    if "content-length" in resp.headers:
        response_headers["Content-Length"] = resp.headers["content-length"]

    media_type = resp.headers.get("content-type", "video/mp4")

    return StreamingResponse(
        _stream(),
        status_code=resp.status_code,
        media_type=media_type,
        headers=response_headers,
    )

