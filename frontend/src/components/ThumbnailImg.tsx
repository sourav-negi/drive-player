// ------------------------------------------------------------------
// drive-pleya — shared thumbnail image with 2-stage fallback
// ------------------------------------------------------------------

"use client";

import { useState } from "react";
import type { VideoFile } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  file: VideoFile;
  /** Extra classes for the img wrapper (aspect-video, rounded, etc.) */
  className?: string;
  /** Size of the fallback play-icon SVG */
  iconSize?: "sm" | "md";
}

export function ThumbnailImg({ file, className = "", iconSize = "md" }: Props) {
  const { id, name, thumbnailLink } = file;
  // 0 = direct Google CDN, 1 = backend proxy, 2 = placeholder
  const [stage, setStage] = useState<0 | 1 | 2>(
    thumbnailLink ? 0 : 1,
  );

  // When we have no thumbnailLink AND the proxy already failed, or both
  // direct + proxy attempts failed, show the placeholder.
  if (stage >= 2 || (!thumbnailLink && stage >= 1 && stage >= 2)) {
    return (
      <div className={`flex items-center justify-center text-text-muted ${className}`}>
        <svg
          className={iconSize === "sm" ? "w-6 h-6" : "w-10 h-10"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z"
          />
        </svg>
      </div>
    );
  }

  const src =
    stage === 0 && thumbnailLink
      ? thumbnailLink
      : api.getThumbnailUrl(id);

  return (
    <img
      src={src}
      alt={name}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={() => setStage((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2))}
    />
  );
}
