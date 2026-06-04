"""
Simple TTL-based in-memory cache.
Used to cache Google Drive file listings and avoid hitting API rate limits.
"""

import time
from threading import Lock


class FileCache:
    """TTL cache backed by a dict with thread-safe writes."""

    def __init__(self, ttl_seconds: int = 300):
        self._ttl = ttl_seconds
        self._cache: dict[str, tuple[float, object]] = {}
        self._lock = Lock()

    def get(self, key: str) -> object | None:
        """Return cached value if not expired, otherwise None."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            timestamp, data = entry
            if time.time() - timestamp < self._ttl:
                return data
            # expired — remove and return None
            del self._cache[key]
            return None

    def set(self, key: str, data: object) -> None:
        """Store a value in the cache with current timestamp."""
        with self._lock:
            self._cache[key] = (time.time(), data)

    def invalidate(self, key: str | None = None) -> None:
        """Remove a specific key, or clear everything if no key given."""
        with self._lock:
            if key:
                self._cache.pop(key, None)
            else:
                self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)
