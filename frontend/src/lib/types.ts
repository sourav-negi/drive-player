// ------------------------------------------------------------------
// drive-pleya — shared TypeScript types
// ------------------------------------------------------------------

/** A single video file on Google Drive. */
export interface VideoFile {
  id: string;
  name: string;
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** Google Drive thumbnail URL (may be undefined). */
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

/** A folder on Google Drive. */
export interface Folder {
  id: string;
  name: string;
  parent: string;
}

/** Response from GET /api/files */
export interface FilesResponse {
  folders: Folder[];
  files: VideoFile[];
}

/** Watch progress for a single video. */
export interface WatchProgress {
  position: number;
  duration: number;
  percentage: number;
  completed: boolean;
  lastUpdated: string | null;
}

/** Full progress map from GET /api/progress */
export interface ProgressResponse {
  videos: Record<string, WatchProgress>;
}

/** Payload for POST /api/progress/{id} */
export interface ProgressUpdate {
  position: number;
  duration: number;
}

/** Possible states for a data-fetching component. */
export type UiStatus = "loading" | "error" | "empty" | "success";
