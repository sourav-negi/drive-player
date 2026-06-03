"""
Environment variable loading and validation for drive-pleya.
"""

import os
from dotenv import load_dotenv

load_dotenv()


# --- Google Drive API credentials ---
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REFRESH_TOKEN: str = os.getenv("GOOGLE_REFRESH_TOKEN", "")

# --- Drive settings ---
GOOGLE_DRIVE_FOLDER_ID: str = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "root")
PROGRESS_FILE_NAME: str = os.getenv("PROGRESS_FILE_NAME", ".watch-progress.json")

# --- CORS ---
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000"
).split(",")

# --- Streaming mode ---
# "proxy" = backend streams through itself (handles token expiry, uses bandwidth)
# "redirect" = backend returns 302 to Google Drive URL (zero bandwidth, token in URL)
USE_DIRECT_REDIRECT: bool = (
    os.getenv("USE_DIRECT_REDIRECT", "false").lower() == "true"
)

# --- Video mime types we support ---
VIDEO_MIME_TYPES: set[str] = {
    "video/mp4",
    "video/webm",
    "video/x-matroska",   # mkv
    "video/quicktime",    # mov
    "video/x-msvideo",    # avi
    "video/x-ms-wmv",     # wmv
    "video/mpeg",         # mpeg
    "video/ogg",
    "video/3gpp",
    "video/x-flv",
}


def validate() -> list[str]:
    """Validate required env vars. Returns list of missing vars (empty = all good)."""
    missing = []
    if not GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not GOOGLE_REFRESH_TOKEN:
        missing.append("GOOGLE_REFRESH_TOKEN")
    return missing
