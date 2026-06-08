// ------------------------------------------------------------------
// drive-pleya — video thumbnail card
// ------------------------------------------------------------------

import Link from "next/link";
import type { VideoFile, WatchProgress } from "@/lib/types";
import { formatTitle } from "@/lib/format";
import { ProgressBadge } from "./ProgressBadge";
import { ThumbnailImg } from "./ThumbnailImg";

interface Props {
  file: VideoFile;
  progress?: WatchProgress;
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
        <ThumbnailImg
          file={file}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
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
