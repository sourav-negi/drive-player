// ------------------------------------------------------------------
// drive-pleya — playlist sidebar (YouTube-style video list)
// ------------------------------------------------------------------

"use client";

import Link from "next/link";
import type { VideoFile } from "@/lib/types";
import { formatTitle } from "@/lib/format";
import { ThumbnailImg } from "./ThumbnailImg";

interface Props {
  files: VideoFile[];
  currentId: string;
}

export function PlaylistSidebar({ files, currentId }: Props) {
  return (
    <div className="flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto">
      {files.map((f, i) => {
        const isActive = f.id === currentId;
        return (
          <Link
            key={f.id}
            href={`/watch/${encodeURIComponent(f.id)}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-brand/10 border border-brand/30"
                : "hover:bg-surface-raised border border-transparent"
            }`}
          >
            {/* number */}
            <span
              className={`w-6 text-center text-xs font-mono flex-shrink-0 ${
                isActive ? "text-brand font-bold" : "text-text-muted"
              }`}
            >
              {isActive ? "▶" : i + 1}
            </span>

            {/* thumbnail */}
            <div className="w-28 flex-shrink-0 aspect-video bg-surface-card rounded overflow-hidden">
              <ThumbnailImg file={f} className="w-full h-full" iconSize="sm" />
            </div>

            {/* title */}
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm truncate font-medium ${
                  isActive ? "text-brand" : "text-text"
                }`}
              >
                {formatTitle(f.name)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
