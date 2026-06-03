// ------------------------------------------------------------------
// drive-pleya — video player with custom controls overlay
// ------------------------------------------------------------------

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { SeekBar } from "./SeekBar";
import { SpeedSelector } from "./SpeedSelector";
import { VolumeControl } from "./VolumeControl";
import type { WatchProgress } from "@/lib/types";

interface Props {
  src: string;
  fileId: string;
  title: string;
  initialProgress?: WatchProgress;
}

export function VideoPlayer({ src, fileId, title, initialProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [resumePrompt, setResumePrompt] = useState(false);

  // player state
  const player = useVideoPlayer(videoRef);

  // watch progress
  const { saveOnPause } = useWatchProgress({
    fileId,
    videoRef,
    onProgressLoaded: (p) => {
      if (p && p.position > 5 && !p.completed) {
        setResumePrompt(true);
      }
    },
  });

  // ------------------------------------------------------------------
  // auto-hide controls
  // ------------------------------------------------------------------
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (player.playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [player.playing]);

  useEffect(() => {
    if (player.playing) {
      resetHideTimer();
    } else {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [player.playing, resetHideTimer]);

  // ------------------------------------------------------------------
  // keyboard shortcuts
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // don't intercept input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          player.togglePlay();
          break;
        case "ArrowLeft":
        case "j":
          player.skip(-10);
          break;
        case "ArrowRight":
        case "l":
          player.skip(10);
          break;
        case "ArrowUp":
          player.setVolume(Math.min(1, player.volume + 0.1));
          break;
        case "ArrowDown":
          player.setVolume(Math.max(0, player.volume - 0.1));
          break;
        case "m":
          player.toggleMute();
          break;
        case "f":
          player.toggleFullscreen();
          break;
        case ">":
        case ".":
          player.cycleSpeed(1);
          break;
        case "<":
        case ",":
          player.cycleSpeed(-1);
          break;
        default:
          if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            player.seek((Number(e.key) / 10) * player.duration);
          }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player]);

  // ------------------------------------------------------------------
  // render
  // ------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => player.playing && setShowControls(false)}
    >
      {/* resume prompt */}
      {resumePrompt && initialProgress && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-surface-card border border-border rounded-lg px-4 py-3 shadow-xl">
          <p className="text-sm text-text mb-2">
            resume from {fmtTime(initialProgress.position)}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setResumePrompt(false);
                videoRef.current?.play();
              }}
              className="px-3 py-1 text-xs font-medium bg-brand text-white rounded hover:bg-brand-hover transition-colors"
            >
              resume
            </button>
            <button
              onClick={() => {
                setResumePrompt(false);
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
              className="px-3 py-1 text-xs text-text-muted hover:text-text transition-colors"
            >
              start over
            </button>
          </div>
        </div>
      )}

      {/* video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[80vh] cursor-pointer"
        onClick={player.togglePlay}
        onPause={() => saveOnPause()}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
      />

      {/* controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-12 pb-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <SeekBar
          currentTime={player.currentTime}
          duration={player.duration}
          onSeek={player.seek}
        />

        <div className="flex items-center justify-between mt-1">
          {/* left controls */}
          <div className="flex items-center gap-2">
            {/* skip back */}
            <button
              onClick={() => player.skip(-10)}
              className="h-8 w-8 flex items-center justify-center rounded text-text hover:text-white transition-colors"
              title="back 10s"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
            </button>

            {/* play / pause */}
            <button
              onClick={player.togglePlay}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
              title={player.playing ? "pause" : "play"}
            >
              {player.playing ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* skip forward */}
            <button
              onClick={() => player.skip(10)}
              className="h-8 w-8 flex items-center justify-center rounded text-text hover:text-white transition-colors"
              title="forward 10s"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
              </svg>
            </button>

            {/* time */}
            <span className="text-xs text-text-muted ml-2 tabular-nums min-w-[80px]">
              {fmtTime(player.currentTime)} / {fmtTime(player.duration)}
            </span>
          </div>

          {/* right controls */}
          <div className="flex items-center gap-2">
            <VolumeControl
              volume={player.volume}
              muted={player.muted}
              onVolume={player.setVolume}
              onToggleMute={player.toggleMute}
            />
            <SpeedSelector
              speed={player.speed}
              speeds={player.SPEEDS}
              onChange={player.setSpeed}
            />
            {/* fullscreen */}
            <button
              onClick={player.toggleFullscreen}
              className="h-8 w-8 flex items-center justify-center rounded text-text hover:text-white transition-colors"
              title="fullscreen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
