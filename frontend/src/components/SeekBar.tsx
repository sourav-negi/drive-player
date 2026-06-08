// ------------------------------------------------------------------
// drive-pleya — clickable / draggable seek bar (mouse + touch)
// ------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

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
  const [hoverOffset, setHoverOffset] = useState(0);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const posFromClientX = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration <= 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  // ---- mouse ----

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setDragging(true);
    onSeek(posFromClientX(e.clientX));
  };

  const handleMouseMove = useCallback(
    (e: { clientX: number }) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const t = posFromClientX(e.clientX);
      setHoverTime(t);
      setHoverOffset(e.clientX - rect.left);
      if (dragging) onSeek(t);
    },
    [dragging, onSeek, posFromClientX],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // global listeners for drag-seek (mouse)
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [dragging, handleMouseMove, handleDragEnd]);

  // ---- touch ----

  const touchIdRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    touchMovedRef.current = false;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === touchIdRef.current,
    );
    if (!touch || duration <= 0) return;
    touchMovedRef.current = true;
    onSeek(posFromClientX(touch.clientX));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === touchIdRef.current,
    );
    // tap (no drag) — seek once on release
    if (touch && duration > 0 && !touchMovedRef.current) {
      onSeek(posFromClientX(touch.clientX));
    }
    touchIdRef.current = null;
    touchMovedRef.current = false;
    setDragging(false);
  };

  // ---- render ----

  return (
    <div className="group relative">
      {/* time labels */}
      <div className="flex justify-between text-[11px] sm:text-xs text-gray-700 mb-1 px-1 tabular-nums">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* bar — taller on touch devices */}
      <div
        ref={barRef}
        className="relative h-6 sm:h-5 flex items-center cursor-pointer touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          const rect = barRef.current?.getBoundingClientRect();
          setHoverTime(posFromClientX(e.clientX));
          if (rect) setHoverOffset(e.clientX - rect.left);
        }}
        onMouseLeave={() => setHoverTime(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* track */}
        <div className="absolute w-full h-1 sm:h-1 bg-black/20 rounded-full pointer-events-none" />
        {/* filled */}
        <div
          className="absolute h-1 sm:h-1 bg-black rounded-full pointer-events-none"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* thumb */}
        <div
          className="absolute w-3.5 h-3.5 bg-black rounded-full -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* hover tooltip — hidden on touch (no hover) */}
      {hoverTime !== null && !dragging && (
        <div
          className="absolute -top-7 text-[11px] bg-black text-white px-1.5 py-0.5 rounded pointer-events-none hidden sm:block"
          style={{ left: hoverOffset, transform: "translateX(-50%)" }}
        >
          {fmt(hoverTime)}
        </div>
      )}
    </div>
  );
}
