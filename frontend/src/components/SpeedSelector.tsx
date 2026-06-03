// ------------------------------------------------------------------
// drive-pleya — playback speed selector
// ------------------------------------------------------------------

import { useState, useRef, useEffect } from "react";
import type { PlaybackSpeed } from "@/hooks/useVideoPlayer";

interface Props {
  speed: PlaybackSpeed;
  speeds: readonly PlaybackSpeed[];
  onChange: (s: PlaybackSpeed) => void;
}

export function SpeedSelector({ speed, speeds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2 rounded text-xs font-medium text-text bg-white/10 hover:bg-white/20 transition-colors"
        title="playback speed"
      >
        {speed}×
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-surface-card border border-border rounded-lg py-1 shadow-lg z-50">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`block w-full text-left px-4 py-1.5 text-xs whitespace-nowrap hover:bg-white/10 transition-colors ${
                s === speed ? "text-brand font-medium" : "text-text"
              }`}
            >
              {s === speed && "• "}
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
