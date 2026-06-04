// ------------------------------------------------------------------
// drive-pleya — localStorage-based watch progress
// ------------------------------------------------------------------

import type { WatchProgress } from "./types";

const STORAGE_KEY = "drive-pleya:progress";

function loadAll(): Record<string, WatchProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, WatchProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded */
  }
}

export const progressStore = {
  /** Get all progress entries. */
  getAll(): Record<string, WatchProgress> {
    return loadAll();
  },

  /** Get progress for a single video. */
  get(fileId: string): WatchProgress | null {
    const all = loadAll();
    return all[fileId] ?? null;
  },

  /** Save progress for a video. */
  save(
    fileId: string,
    position: number,
    duration: number,
  ): WatchProgress {
    const all = loadAll();
    const pct =
      duration > 0 ? Math.round((position / duration) * 1000) / 10 : 0;
    const entry: WatchProgress = {
      position,
      duration,
      percentage: pct,
      completed: pct > 90,
      lastUpdated: new Date().toISOString(),
    };
    all[fileId] = entry;
    saveAll(all);
    return entry;
  },

  /** Delete progress for a video. */
  delete(fileId: string): boolean {
    const all = loadAll();
    if (fileId in all) {
      delete all[fileId];
      saveAll(all);
      return true;
    }
    return false;
  },
};
