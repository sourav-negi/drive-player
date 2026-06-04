// ------------------------------------------------------------------
// drive-pleya — watch page (video player)
// ------------------------------------------------------------------

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { progressStore } from "@/lib/progressStore";
import { VideoPlayer } from "@/components/VideoPlayer";
import { UiState } from "@/components/UiState";
import type { VideoFile, WatchProgress } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function WatchPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [file, setFile] = useState<VideoFile | null>(null);
  const [progress, setProgress] = useState<WatchProgress | undefined>();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const f = await api.getFile(id);
        const p = progressStore.get(id);
        if (cancelled) return;
        setFile(f);
        setProgress(p ?? undefined);
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed to load video");
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
      errorMessage={error}
      onRetry={() => router.refresh()}
    >
      {file && (
        <div className="flex flex-col gap-4">
          {/* player */}
          <VideoPlayer
            src={api.getStreamUrl(file.id)}
            fileId={file.id}
            title={file.name}
            initialProgress={progress}
          />

          {/* video info */}
          <div>
            <h2 className="text-lg font-semibold text-text">{file.name}</h2>
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
            onClick={() => router.back()}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            ← back to library
          </button>
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
