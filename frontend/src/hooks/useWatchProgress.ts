// ------------------------------------------------------------------
// drive-pleya — watch progress tracking
// ------------------------------------------------------------------

import { useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { WatchProgress } from "@/lib/types";

const SAVE_INTERVAL_MS = 10_000;   // periodic save while playing
const RESUME_THRESHOLD_S = 5;      // only ask to resume if > 5 s in

interface Props {
  fileId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
    let cancelled = false;
    api
      .getProgress(fileId)
      .then((p) => {
        if (cancelled || !p) return;
        onProgressLoaded?.(p);
        if (p.position > RESUME_THRESHOLD_S && videoRef.current) {
          videoRef.current.currentTime = p.position;
        }
      })
      .catch(() => {
        /* no saved progress — fine */
      });
    return () => {
      cancelled = true;
    };
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
      // avoid duplicate saves for the same position
      if (Math.abs(pos - lastSavedRef.current) < 0.5) return;
      lastSavedRef.current = pos;
      durationRef.current = dur;
      api.saveProgress(fileId, { position: pos, duration: dur }).catch(() => {});
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fileId, videoRef]);

  // ------------------------------------------------------------------
  // save on pause (immediate = true)
  // ------------------------------------------------------------------
  const saveOnPause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const pos = el.currentTime;
    const dur = el.duration || durationRef.current;
    api
      .saveProgress(fileId, { position: pos, duration: dur }, true)
      .catch(() => {});
  }, [fileId, videoRef]);

  // ------------------------------------------------------------------
  // save on page unload (sendBeacon, fire-and-forget)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleUnload = () => {
      const el = videoRef.current;
      if (!el) return;
      const pos = el.currentTime;
      const dur = el.duration || durationRef.current;
      const body = JSON.stringify({ position: pos, duration: dur });
      const url = `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/api/progress/${encodeURIComponent(fileId)}?immediate=true`;
      navigator.sendBeacon(url, body);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [fileId, videoRef]);

  return { saveOnPause };
}
