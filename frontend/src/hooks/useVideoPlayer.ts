// ------------------------------------------------------------------
// drive-pleya — video player state management
// ------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const STORAGE_KEY_VOLUME = "drive-pleya:volume";
const STORAGE_KEY_SPEED = "drive-pleya:speed";

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useVideoPlayer(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => loadStored(STORAGE_KEY_VOLUME, 1));
  const [muted, setMuted] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(() =>
    loadStored(STORAGE_KEY_SPEED, 1),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // sync from video element events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onDuration = () => setDuration(el.duration || 0);
    const onVolume = () => {
      setVolume(el.volume);
      setMuted(el.muted);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("volumechange", onVolume);

    // initial values
    setVolume(el.volume);
    setMuted(el.muted);
    if (el.duration) setDuration(el.duration);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("volumechange", onVolume);
    };
  }, [videoRef]);

  // play / pause
  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  }, [videoRef]);

  // seek
  const seek = useCallback(
    (seconds: number) => {
      const el = videoRef.current;
      if (el) el.currentTime = Math.max(0, Math.min(el.duration || 0, seconds));
    },
    [videoRef],
  );

  const skip = useCallback(
    (delta: number) => {
      const el = videoRef.current;
      if (el) seek(el.currentTime + delta);
    },
    [videoRef, seek],
  );

  // volume
  const setVolumeAndSave = useCallback(
    (v: number) => {
      const el = videoRef.current;
      if (el) {
        el.volume = v;
        el.muted = v === 0;
      }
      setVolume(v);
      setMuted(v === 0);
      saveStored(STORAGE_KEY_VOLUME, v);
    },
    [videoRef],
  );

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, [videoRef]);

  // speed
  const setSpeed = useCallback(
    (s: PlaybackSpeed) => {
      const el = videoRef.current;
      if (el) el.playbackRate = s;
      setSpeedState(s);
      saveStored(STORAGE_KEY_SPEED, s);
    },
    [videoRef],
  );

  const cycleSpeed = useCallback(
    (dir: 1 | -1) => {
      const idx = SPEEDS.indexOf(speed);
      const next = (idx + dir + SPEEDS.length) % SPEEDS.length;
      setSpeed(SPEEDS[next]);
    },
    [speed, setSpeed],
  );

  // fullscreen
  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return {
    playing,
    currentTime,
    duration,
    volume,
    muted,
    speed,
    isFullscreen,
    togglePlay,
    seek,
    skip,
    setVolume: setVolumeAndSave,
    toggleMute,
    setSpeed,
    cycleSpeed,
    toggleFullscreen,
    SPEEDS,
  } as const;
}
