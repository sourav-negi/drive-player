"""
Google Drive API wrapper for drive-pleya.

Handles:
- OAuth token management (auto-refresh using stored refresh token)
- File listing with pagination and video mime-type filtering
- Single file metadata
- Folder listing
- JSON file create / read / update (for watch progress storage)
"""

import io
import json
import logging
from typing import Any

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
    PROGRESS_FILE_NAME,
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
    """Wraps Google Drive API v3 with token refresh and pagination handling."""

    def __init__(self) -> None:
        self._credentials: Credentials | None = None
        self._service: Any | None = None

    # ---- auth ---------------------------------------------------------------

    def _ensure_credentials(self) -> Credentials:
        """Build or refresh credentials, returning a valid token-bearing object."""
        if self._credentials is None:
            self._credentials = Credentials(
                token=None,
                refresh_token=GOOGLE_REFRESH_TOKEN,
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                token_uri="https://oauth2.googleapis.com/token",
            )
        # Refresh if expired or about to expire
        if not self._credentials.valid:
            self._credentials.refresh(Request())
        return self._credentials

    def _get_service(self):
        """Lazily build and return the Drive v3 service."""
        if self._service is None:
            creds = self._ensure_credentials()
            self._service = build("drive", "v3", credentials=creds)
        return self._service

    def get_access_token(self) -> str:
        """Return a valid access token (refreshing if needed)."""
        return self._ensure_credentials().token

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
                # double-check video mime type (Drive sometimes returns
                # partial matches on the query)
                if f.get("mimeType", "") in VIDEO_MIME_TYPES:
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

    # ---- json file operations (progress store) -------------------------------

    def find_file_by_name(self, name: str) -> dict | None:
        """Find a file by exact name. Returns {id, name} or None."""
        service = self._get_service()
        query = (
            f"name = '{name}' and trashed = false "
            f"and '{GOOGLE_DRIVE_FOLDER_ID}' in parents"
        )
        response = (
            service.files()
            .list(q=query, spaces="drive", fields="files(id, name)", pageSize=1)
            .execute()
        )
        files = response.get("files", [])
        return {"id": files[0]["id"], "name": files[0]["name"]} if files else None

    def create_json_file(self, name: str, data: dict) -> str:
        """Create a new JSON file on Drive. Returns the file ID."""
        service = self._get_service()
        json_bytes = json.dumps(data, indent=2).encode("utf-8")
        media = MediaIoBaseUpload(
            io.BytesIO(json_bytes),
            mimetype="application/json",
            resumable=False,
        )
        file_metadata = {
            "name": name,
            "parents": [GOOGLE_DRIVE_FOLDER_ID],
        }
        created = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id")
            .execute()
        )
        logger.info("created progress file on drive: %s", created["id"])
        return created["id"]

    def read_json_file(self, file_id: str) -> dict:
        """Download and parse a JSON file from Drive."""
        service = self._get_service()
        request = service.files().get_media(fileId=file_id)
        content = request.execute()
        return json.loads(content.decode("utf-8"))

    def update_json_file(self, file_id: str, data: dict) -> None:
        """Overwrite a JSON file on Drive with new content."""
        service = self._get_service()
        json_bytes = json.dumps(data, indent=2).encode("utf-8")
        media = MediaIoBaseUpload(
            io.BytesIO(json_bytes),
            mimetype="application/json",
            resumable=False,
        )
        service.files().update(fileId=file_id, media_body=media).execute()
        logger.debug("updated progress file on drive: %s", file_id)


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
