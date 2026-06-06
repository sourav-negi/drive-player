// ------------------------------------------------------------------
// drive-pleya — video player state management
// ------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4;

const SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4];
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
    /* quota exceeded */
  }
}

export interface VideoPlayerAPI {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: PlaybackSpeed;
  isFullscreen: boolean;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSpeed: (s: PlaybackSpeed) => void;
  cycleSpeed: (dir: 1 | -1) => void;
  toggleFullscreen: () => void;
  SPEEDS: readonly PlaybackSpeed[];
}

export function useVideoPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  fullscreenRef?: RefObject<HTMLDivElement | null>,
): VideoPlayerAPI {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => loadStored(STORAGE_KEY_VOLUME, 1));
  const [muted, setMuted] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(() =>
    loadStored(STORAGE_KEY_SPEED, 1),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // sync fullscreen state with browser (handles Esc key)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // sync from video element events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => { setPlaying(true); setBuffering(false); };
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onDuration = () => setDuration(el.duration || 0);
    const onVolume = () => { setVolumeState(el.volume); setMuted(el.muted); };
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("volumechange", onVolume);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);

    // init
    setVolumeState(el.volume);
    setMuted(el.muted);
    if (el.duration) setDuration(el.duration);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("volumechange", onVolume);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
    };
  }, [videoRef]);

  // ------- actions (direct, no guards) -------

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [videoRef]);

  const seek = useCallback((seconds: number) => {
    const el = videoRef.current;
    if (el) el.currentTime = seconds;
  }, [videoRef]);

  const skip = useCallback((delta: number) => {
    const el = videoRef.current;
    if (el) el.currentTime = el.currentTime + delta;
  }, [videoRef]);

  const setVolumeAndSave = useCallback((v: number) => {
    const el = videoRef.current;
    if (el) { el.volume = v; el.muted = v === 0; }
    setVolumeState(v);
    setMuted(v === 0);
    saveStored(STORAGE_KEY_VOLUME, v);
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, [videoRef]);

  const setSpeed = useCallback((s: PlaybackSpeed) => {
    const el = videoRef.current;
    if (el) el.playbackRate = s;
    setSpeedState(s);
    saveStored(STORAGE_KEY_SPEED, s);
  }, [videoRef]);

  const cycleSpeed = useCallback((dir: 1 | -1) => {
    const idx = SPEEDS.indexOf(speed);
    const next = (idx + dir + SPEEDS.length) % SPEEDS.length;
    setSpeed(SPEEDS[next]);
  }, [speed, setSpeed]);

  const toggleFullscreen = useCallback(() => {
    const target = fullscreenRef?.current ?? videoRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [videoRef, fullscreenRef]);

  return {
    playing, buffering, currentTime, duration, volume, muted, speed, isFullscreen,
    togglePlay, seek, skip,
    setVolume: setVolumeAndSave,
    toggleMute, setSpeed, cycleSpeed, toggleFullscreen,
    SPEEDS,
  };
}
