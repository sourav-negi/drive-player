// ------------------------------------------------------------------
// drive-pleya — clickable / draggable seek bar
// ------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SeekBar({ currentTime, duration, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toSeconds = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration <= 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const handleClick = (e: React.MouseEvent) => {
    onSeek(toSeconds(e.clientX));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    onSeek(toSeconds(e.clientX));
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const t = toSeconds(e.clientX);
      setHoverTime(t);
      setHoverX(e.clientX);
      if (dragging) onSeek(t);
    },
    [dragging, onSeek, toSeconds],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleMouseEnter = () => {};
  const handleMouseLeave = () => setHoverTime(null);

  return (
    <div className="group relative">
      {/* time labels */}
      <div className="flex justify-between text-[11px] text-text-muted mb-1 px-1">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* bar */}
      <div
        ref={barRef}
        className="relative h-5 flex items-center cursor-pointer"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          setHoverTime(toSeconds(e.clientX));
          setHoverX(e.clientX);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* track */}
        <div className="absolute w-full h-1 bg-white/20 rounded-full" />
        {/* filled */}
        <div
          className="absolute h-1 bg-brand rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* thumb */}
        <div
          className="absolute w-3 h-3 bg-brand rounded-full -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* hover tooltip */}
      {hoverTime !== null && !dragging && (
        <div
          className="absolute -top-7 text-[11px] bg-surface-card text-text px-1.5 py-0.5 rounded pointer-events-none"
          style={{ left: hoverX, transform: "translateX(-50%)" }}
        >
          {fmt(hoverTime)}
        </div>
      )}
    </div>
  );
}
