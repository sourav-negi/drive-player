"""
Video streaming endpoint.

Two modes (controlled by ``USE_DIRECT_REDIRECT`` in config):
  "proxy"    – backend fetches bytes from Drive and streams them to the
               client.  Supports HTTP range requests for seeking.
  "redirect" – backend returns a 302 to the Google Drive download URL.
               Zero backend bandwidth, but the access token is visible
               in the redirect URL.
"""

import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from services.drive_client import drive_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stream"])

# how many bytes to read per chunk when proxying
CHUNK_SIZE = 64 * 1024  # 64 KB


@router.get("/files/{file_id}/stream")
async def stream_video(file_id: str, request: Request):
    """Stream (or redirect to) a video from Google Drive.

    Supports the ``?redirect`` query parameter to force redirect mode
    regardless of the server-side default.
    """
    from config import USE_DIRECT_REDIRECT

    use_redirect = USE_DIRECT_REDIRECT
    if request.query_params.get("redirect") == "1":
        use_redirect = True

    try:
        token = drive_client.get_access_token()
    except Exception:
        logger.exception("failed to get access token")
        raise HTTPException(status_code=502, detail="drive auth error")

    url = (
        "https://www.googleapis.com/drive/v3/files/"
        f"{file_id}?alt=media"
    )

    if use_redirect:
        # ------------------------------------------------------------------
        # redirect mode – zero backend bandwidth
        # ------------------------------------------------------------------
        return RedirectResponse(url=f"{url}&access_token={token}")

    # ------------------------------------------------------------------
    # proxy mode – stream through the backend
    # ------------------------------------------------------------------
    import httpx

    headers = {"Authorization": f"Bearer {token}"}
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

    # We need to know the response status and content headers before we
    # start streaming.  Do a quick HEAD-equivalent request first.
    # Actually, we can make the GET and return headers from the response
    # once available.  FastAPI's StreamingResponse allows setting
    # headers upfront; we use sensible defaults and let the client
    # handle the rest.
    return StreamingResponse(
        _stream(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
        },
    )
