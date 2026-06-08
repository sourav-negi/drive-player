// ------------------------------------------------------------------
// drive-pleya — watch page (video player + playlist sidebar)
// ------------------------------------------------------------------

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { progressStore } from "@/lib/progressStore";
import { formatTitle } from "@/lib/format";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PlaylistSidebar } from "@/components/PlaylistSidebar";
import { UiState } from "@/components/UiState";
import type { VideoFile, WatchProgress } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function WatchPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [file, setFile] = useState<VideoFile | null>(null);
  const [allFiles, setAllFiles] = useState<VideoFile[]>([]);
  const [progress, setProgress] = useState<WatchProgress | undefined>();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const [f, list] = await Promise.all([
          api.getFile(id),
          api.getFiles().then((r) => r.files),
        ]);
        const p = progressStore.get(id);
        if (cancelled) return;
        setFile(f);
        setAllFiles(list);
        setProgress(p ?? undefined);
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <UiState
      status={status}
      loadingMessage="loading video..."
      errorMessage={error instanceof Error ? error.message : "failed to load video"}
      error={error}
      onRetry={() => router.refresh()}
    >
      {file && (
        <div className="flex flex-col xl:flex-row gap-4">
          {/* --- primary: player + info --- */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <VideoPlayer
              src={api.getStreamUrl(file.id)}
              fileId={file.id}
              title={formatTitle(file.name)}
              initialProgress={progress}
            />

            {/* video info */}
            <div>
              <h2 className="text-lg font-semibold text-text">
                {formatTitle(file.name)}
              </h2>
              {file.modifiedTime && (
                <p className="text-xs text-text-muted mt-1">
                  modified{" "}
                  {new Date(file.modifiedTime).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
              {file.size > 0 && (
                <p className="text-xs text-text-muted">{formatSize(file.size)}</p>
              )}
            </div>

            {/* back link */}
            <button
              onClick={() => router.push("/")}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              ← back to library
            </button>
          </div>

          {/* --- sidebar: playlist (below on mobile, side on xl+) --- */}
          {allFiles.length > 0 && (
            <div className="xl:w-80 xl:flex-shrink-0 w-full">
              <PlaylistSidebar files={allFiles} currentId={file.id} />
            </div>
          )}
        </div>
      )}
    </UiState>
  );
}

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}
