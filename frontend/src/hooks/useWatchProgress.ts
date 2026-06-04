// ------------------------------------------------------------------
// drive-pleya — watch progress tracking (localStorage)
// ------------------------------------------------------------------

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { progressStore } from "@/lib/progressStore";
import type { WatchProgress } from "@/lib/types";

const SAVE_INTERVAL_MS = 10_000;   // periodic save while playing
const RESUME_THRESHOLD_S = 5;      // only ask to resume if > 5 s in

interface Props {
  fileId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Called with saved progress when it is first loaded. */
  onProgressLoaded?: (p: WatchProgress | null) => void;
}

export function useWatchProgress({ fileId, videoRef, onProgressLoaded }: Props) {
  const lastSavedRef = useRef(0);
  const durationRef = useRef(0);

  // ------------------------------------------------------------------
  // load saved progress on mount → seek if applicable
  // ------------------------------------------------------------------
  useEffect(() => {
    const saved = progressStore.get(fileId);
    if (saved) {
      onProgressLoaded?.(saved);
      if (saved.position > RESUME_THRESHOLD_S && videoRef.current) {
        videoRef.current.currentTime = saved.position;
      }
    }
  }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // periodic save (every SAVE_INTERVAL_MS while playing)
  // ------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const el = videoRef.current;
      if (!el || el.paused) return;
      const pos = el.currentTime;
      const dur = el.duration || durationRef.current;
      if (Math.abs(pos - lastSavedRef.current) < 0.5) return;
      lastSavedRef.current = pos;
      durationRef.current = dur;
      progressStore.save(fileId, pos, dur);
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fileId, videoRef]);

  // ------------------------------------------------------------------
  // save on pause
  // ------------------------------------------------------------------
  const saveOnPause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    progressStore.save(fileId, el.currentTime, el.duration || durationRef.current);
  }, [fileId, videoRef]);

  return { saveOnPause };
}
