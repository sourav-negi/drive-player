// ------------------------------------------------------------------
// drive-pleya — typed API client with cold-start awareness
// ------------------------------------------------------------------

import type { VideoFile, FilesResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// Render free tier wakes from sleep in 30–60 s.  We use a long timeout
// so the server has a chance to wake up instead of timing out too early.
const COLD_START_TIMEOUT_MS = 45_000;
const NORMAL_TIMEOUT_MS = 12_000;

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public coldStart: boolean = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number; retries?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? NORMAL_TIMEOUT_MS;
  const maxRetries = options?.retries ?? 0;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // small delay between retries (increase with each attempt)
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 2_000));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${API_BASE}${path}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      clearTimeout(timer);

      if (!res.ok) {
        let body = "";
        try { body = await res.text(); } catch { /* ignore */ }
        throw new ApiError(res.status, body || res.statusText);
      }

      return res.json();
    } catch (err) {
      clearTimeout(timer);

      // already an ApiError (known HTTP error) — don't retry
      if (err instanceof ApiError) throw err;

      lastError = err instanceof Error ? err : new Error(String(err));

      // AbortError with timeout → likely cold start
      const isTimeout =
        err instanceof DOMException && err.name === "AbortError";

      // Only retry on timeouts (cold starts); network errors get
      // retried once, then marked as potential cold starts.
      if (isTimeout || (attempt < maxRetries && !(err instanceof ApiError))) {
        continue;
      }
    }
  }

  // All retries exhausted — surface as a cold-start-aware error
  throw new ApiError(
    0,
    lastError?.message || "request failed",
    true,   // coldStart = true after timeouts
  );
}

// ------------------------------------------------------------------
// api object
// ------------------------------------------------------------------

export const api = {
  /** List videos and folders (optionally scoped to a folder). */
  getFiles(folderId?: string): Promise<FilesResponse> {
    const qs = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
    return fetchApi<FilesResponse>(`/api/files${qs}`, {
      timeoutMs: COLD_START_TIMEOUT_MS,
      retries: 2,
    });
  },

  /** Get metadata for a single file. */
  getFile(id: string): Promise<VideoFile> {
    return fetchApi<VideoFile>(`/api/files/${encodeURIComponent(id)}`, {
      timeoutMs: COLD_START_TIMEOUT_MS,
      retries: 2,
    });
  },

  /** Return the URL that the <video> element should use as its src. */
  getStreamUrl(fileId: string): string {
    return `${API_BASE}/api/files/${encodeURIComponent(fileId)}/stream`;
  },

  /** Return a thumbnail proxy URL (backend fetches it with OAuth). */
  getThumbnailUrl(fileId: string): string {
    return `${API_BASE}/api/files/${encodeURIComponent(fileId)}/thumbnail`;
  },

  /** Quick health-check ping — used to detect cold starts. */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(`${API_BASE}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  },
};
