// ------------------------------------------------------------------
// drive-pleya — typed API client
// ------------------------------------------------------------------

import type {
  VideoFile,
  FilesResponse,
  ProgressResponse,
  WatchProgress,
  ProgressUpdate,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json();
}

// ------------------------------------------------------------------
// api object
// ------------------------------------------------------------------

export const api = {
  /** List videos and folders (optionally scoped to a folder). */
  getFiles(folderId?: string): Promise<FilesResponse> {
    const qs = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
    return fetchApi<FilesResponse>(`/api/files${qs}`);
  },

  /** Get metadata for a single file. */
  getFile(id: string): Promise<VideoFile> {
    return fetchApi<VideoFile>(`/api/files/${encodeURIComponent(id)}`);
  },

  /** Return the URL that the <video> element should use as its src. */
  getStreamUrl(fileId: string): string {
    return `${API_BASE}/api/files/${encodeURIComponent(fileId)}/stream`;
  },

  /** Get all watch progress. */
  getAllProgress(): Promise<ProgressResponse> {
    return fetchApi<ProgressResponse>("/api/progress");
  },

  /** Get progress for one video. */
  getProgress(fileId: string): Promise<WatchProgress> {
    return fetchApi<WatchProgress>(
      `/api/progress/${encodeURIComponent(fileId)}`,
    );
  },

  /** Save progress. Pass immediate=true for pause / page-unload. */
  async saveProgress(
    fileId: string,
    body: ProgressUpdate,
    immediate = false,
  ): Promise<WatchProgress> {
    const qs = immediate ? "?immediate=true" : "";
    return fetchApi<WatchProgress>(
      `/api/progress/${encodeURIComponent(fileId)}${qs}`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  /** Reset progress for a video. */
  deleteProgress(fileId: string): Promise<void> {
    return fetchApi<void>(
      `/api/progress/${encodeURIComponent(fileId)}`,
      { method: "DELETE" },
    );
  },
};

export { ApiError };
