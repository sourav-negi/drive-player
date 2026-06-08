"""
Environment variable loading and validation for drive-pleya.
"""

import os
from dotenv import load_dotenv

load_dotenv()


# --- Google Drive OAuth ---
# Get these by running:  python get_refresh_token.py
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REFRESH_TOKEN: str = os.getenv("GOOGLE_REFRESH_TOKEN", "")

# --- Drive settings ---
GOOGLE_DRIVE_FOLDER_ID: str = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "root")

# --- CORS ---
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

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
