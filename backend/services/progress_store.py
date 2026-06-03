"""
Watch-progress storage backed by a JSON file on Google Drive.

- On startup: searches for .watch-progress.json on Drive (or creates it).
- All reads served from an in-memory cache.
- Writes are debounced (30 s) to stay within Drive API rate limits, with
  an ``immediate=True`` escape hatch for pause / page-unload saves.
"""

import asyncio
import logging
from datetime import datetime, timezone

from config import PROGRESS_FILE_NAME
from services.drive_client import drive_client

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ProgressStore:
    """Manages watch-progress data in memory, persisted to a Drive JSON file."""

    def __init__(self) -> None:
        self._store: dict = {}          # file_id → entry
        self._file_id: str | None = None
        self._dirty = False
        self._sync_task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # lifecycle (called from FastAPI lifespan)
    # ------------------------------------------------------------------

    async def initialize(self) -> None:
        """Find or create the progress file on Drive, then load into memory."""
        existing = drive_client.find_file_by_name(PROGRESS_FILE_NAME)
        if existing:
            self._file_id = existing["id"]
            try:
                data = drive_client.read_json_file(self._file_id)
                self._store = data.get("videos", {})
                logger.info("loaded progress for %d videos from drive",
                            len(self._store))
            except Exception:
                logger.warning("could not read progress file; starting fresh")
                self._store = {}
        else:
            logger.info("no progress file found; creating one")
            payload = {"version": 2, "updatedAt": _now_iso(), "videos": {}}
            self._file_id = drive_client.create_json_file(
                PROGRESS_FILE_NAME, payload
            )

    async def flush(self) -> None:
        """Write pending changes to Drive immediately (used on shutdown)."""
        if self._sync_task:
            self._sync_task.cancel()
            self._sync_task = None
        if self._dirty:
            await self._write_to_drive()

    # ------------------------------------------------------------------
    # public read
    # ------------------------------------------------------------------

    def get_all(self) -> dict:
        """Return the full progress map."""
        return dict(self._store)

    def get(self, file_id: str) -> dict | None:
        """Return progress for one video, or None."""
        return self._store.get(file_id)

    # ------------------------------------------------------------------
    # public write
    # ------------------------------------------------------------------

    async def update(
        self, file_id: str, position: float, duration: float, *,
        immediate: bool = False,
    ) -> dict:
        """Save progress for a video, debounced unless ``immediate``."""
        pct = round((position / duration * 100) if duration > 0 else 0, 1)
        entry = {
            "position": position,
            "duration": duration,
            "percentage": pct,
            "completed": pct > 90,
            "lastUpdated": _now_iso(),
        }
        self._store[file_id] = entry
        self._dirty = True

        if immediate:
            await self._write_to_drive()
        else:
            self._schedule_sync()
        return entry

    async def delete(self, file_id: str) -> bool:
        """Remove progress for a video. Returns True if it existed."""
        if file_id in self._store:
            del self._store[file_id]
            self._dirty = True
            self._schedule_sync()
            return True
        return False

    # ------------------------------------------------------------------
    # internal
    # ------------------------------------------------------------------

    def _schedule_sync(self) -> None:
        """Debounce: cancel any queued write and schedule a new one in 30 s."""
        if self._sync_task and not self._sync_task.done():
            self._sync_task.cancel()
        self._sync_task = asyncio.create_task(self._delayed_write())

    async def _delayed_write(self) -> None:
        """Wait 30 s then flush if dirty."""
        await asyncio.sleep(30)
        if self._dirty:
            await self._write_to_drive()

    async def _write_to_drive(self) -> None:
        """Write the full in-memory store to the Drive JSON file."""
        if not self._file_id:
            logger.error("no progress file id – cannot write")
            return
        payload = {
            "version": 2,
            "updatedAt": _now_iso(),
            "videos": self._store,
        }
        try:
            # run blocking Drive API call in a thread so we don't block the
            # event loop
            await asyncio.to_thread(
                drive_client.update_json_file, self._file_id, payload
            )
            self._dirty = False
            logger.debug("synced progress to drive (%d entries)", len(self._store))
        except Exception:
            logger.exception("failed to write progress to drive")


# ------------------------------------------------------------------
# singleton
# ------------------------------------------------------------------

progress_store = ProgressStore()
