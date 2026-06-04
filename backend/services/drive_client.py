"""
Google Drive API wrapper for drive-pleya.

Authenticates via an OAuth 2.0 refresh token — set once in .env and the
app renews access tokens automatically.  Works anywhere: local, Render,
or any other host.
"""

import logging
from typing import Any

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
    VIDEO_MIME_TYPES,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _build_mime_query() -> str:
    """Build the mimeType query fragment for video files."""
    clauses = [f"mimeType = '{mt}'" for mt in sorted(VIDEO_MIME_TYPES)]
    return "(" + " or ".join(clauses) + ")"


# ---------------------------------------------------------------------------
# drive client
# ---------------------------------------------------------------------------

class DriveClient:
    """Wraps Google Drive API v3 using an OAuth 2.0 refresh token."""

    _SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
    _TOKEN_URI = "https://oauth2.googleapis.com/token"

    def __init__(self) -> None:
        self._service: Any = None
        self._credentials: Credentials | None = None

    def _get_credentials(self) -> Credentials:
        """Lazily build OAuth credentials from the refresh token and cache them."""
        if self._credentials is None:
            creds = Credentials(
                token=None,
                refresh_token=GOOGLE_REFRESH_TOKEN,
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                token_uri=self._TOKEN_URI,
                scopes=self._SCOPES,
            )
            creds.refresh(Request())
            self._credentials = creds
        return self._credentials

    def _get_service(self) -> Any:
        """Lazily build and return the Drive v3 service (always returns a valid resource)."""
        if self._service is None:
            self._service = build(
                "drive", "v3", credentials=self._get_credentials()
            )
        return self._service

    def get_access_token(self) -> str:
        """Return a fresh OAuth access token (for direct HTTP streaming requests)."""
        creds = self._get_credentials()
        if not creds.valid:
            creds.refresh(Request())
        token: str | None = creds.token
        assert token is not None, "OAuth token not populated after refresh"
        return token

    # ---- file listing -------------------------------------------------------

    def list_video_files(
        self, folder_id: str | None = None, page_size: int = 100
    ) -> list[dict]:
        """
        Return all video files, optionally scoped to a folder.
        Handles pagination automatically.
        """
        service = self._get_service()
        mime_query = _build_mime_query()
        query = f"{mime_query} and trashed = false"

        target = folder_id or GOOGLE_DRIVE_FOLDER_ID
        if target and target != "root":
            query += f" and '{target}' in parents"

        files: list[dict] = []
        page_token: str | None = None

        while True:
            response = (
                service.files()
                .list(
                    q=query,
                    spaces="drive",
                    fields="nextPageToken, files(id, name, mimeType, size, "
                           "thumbnailLink, createdTime, modifiedTime, parents, "
                           "videoMediaMetadata)",
                    pageToken=page_token,
                    pageSize=page_size,
                )
                .execute()
            )

            for f in response.get("files", []):
                files.append(_normalise_file(f))

            page_token = response.get("nextPageToken")
            if not page_token:
                break

        return files

    def get_file(self, file_id: str) -> dict:
        """Return metadata for a single file by its Drive ID."""
        service = self._get_service()
        response = (
            service.files()
            .get(
                fileId=file_id,
                fields="id, name, mimeType, size, thumbnailLink, "
                       "createdTime, modifiedTime, parents, videoMediaMetadata",
            )
            .execute()
        )
        return _normalise_file(response)

    # ---- folders ------------------------------------------------------------

    def list_folders(self, parent_id: str | None = None) -> list[dict]:
        """List all folders, optionally scoped to a parent."""
        service = self._get_service()
        query = (
            "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        )
        target = parent_id or GOOGLE_DRIVE_FOLDER_ID
        if target and target != "root":
            query += f" and '{target}' in parents"

        folders: list[dict] = []
        page_token: str | None = None

        while True:
            response = (
                service.files()
                .list(
                    q=query,
                    spaces="drive",
                    fields="nextPageToken, files(id, name, parents)",
                    pageToken=page_token,
                    pageSize=100,
                )
                .execute()
            )
            for f in response.get("files", []):
                folders.append({
                    "id": f["id"],
                    "name": f["name"],
                    "parent": f.get("parents", ["root"])[0],
                })
            page_token = response.get("nextPageToken")
            if not page_token:
                break

        return folders


# ---------------------------------------------------------------------------
# single instance
# ---------------------------------------------------------------------------

drive_client = DriveClient()


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _normalise_file(raw: dict) -> dict:
    """Convert a raw Drive API file dict into our standard shape."""
    return {
        "id": raw["id"],
        "name": raw.get("name", "untitled"),
        "mimeType": raw.get("mimeType", ""),
        "size": int(raw.get("size", 0)),
        "thumbnailLink": raw.get("thumbnailLink"),
        "createdTime": raw.get("createdTime"),
        "modifiedTime": raw.get("modifiedTime"),
        "parents": raw.get("parents", []),
    }
