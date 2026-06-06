// ------------------------------------------------------------------
// drive-pleya — video thumbnail card
// ------------------------------------------------------------------

import { useState } from "react";
import Link from "next/link";
import type { VideoFile, WatchProgress } from "@/lib/types";
import { formatTitle } from "@/lib/format";
import { api } from "@/lib/api";
import { ProgressBadge } from "./ProgressBadge";

interface Props {
  file: VideoFile;
  progress?: WatchProgress;
}

function Thumbnail({ file }: { file: VideoFile }) {
  const { id, name, thumbnailLink } = file;
  const [failed, setFailed] = useState(false);

  // try direct link first, then fall back to backend proxy
  const src = failed || !thumbnailLink
    ? api.getThumbnailUrl(id)
    : thumbnailLink;

  if (!thumbnailLink && !failed) {
    // no thumbnail at all — show placeholder immediately
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function VideoCard({ file, progress }: Props) {
  const { id, name } = file;

  return (
    <Link
      href={`/watch/${encodeURIComponent(id)}`}
      className="group block rounded-lg border border-border bg-surface-raised overflow-hidden hover:border-text-muted transition-colors"
    >
      {/* thumbnail */}
      <div className="relative aspect-video bg-surface-card overflow-hidden">
        <Thumbnail file={file} />
        <ProgressBadge progress={progress} />
      </div>

      {/* title */}
      <div className="p-2.5">
        <p className="text-sm font-medium text-text truncate" title={formatTitle(name)}>
          {formatTitle(name)}
        </p>
      </div>
    </Link>
  );
}
