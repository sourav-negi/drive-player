"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { progressStore } from "@/lib/progressStore";
import { formatTitle } from "@/lib/format";
import { ProgressBadge } from "@/components/ProgressBadge";
import { ThumbnailImg } from "@/components/ThumbnailImg";
import type { VideoFile, Folder, WatchProgress } from "@/lib/types";
import { UiState } from "@/components/UiState";

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, WatchProgress>>({});
  const [status, setStatus] = useState<"loading" | "error" | "empty" | "success">("loading");
  const [error, setError] = useState<unknown>(null);

  const fetchData = async (folderId?: string) => {
    setStatus("loading");
    setError(null);
    try {
      const filesRes = await api.getFiles(folderId);
      setFolders(filesRes.folders);
      setFiles(filesRes.files);
      setProgress(progressStore.getAll());
      setStatus(
        filesRes.files.length === 0 && filesRes.folders.length === 0
          ? "empty"
          : "success",
      );
    } catch (err) {
      setError(err);
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openFolder = (folderId: string) => {
    setCurrentFolder(folderId);
    fetchData(folderId);
  };

  const goBack = () => {
    setCurrentFolder(null);
    fetchData();
  };

  if (status !== "success") {
    return (
      <UiState
        status={status}
        loadingMessage="scanning your drive..."
        errorMessage={error instanceof Error ? error.message : "something went wrong"}
        error={error}
        emptyMessage="no videos found on drive"
        onRetry={() => fetchData(currentFolder ?? undefined)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* breadcrumb */}
      {currentFolder && (
        <button
          onClick={goBack}
          className="text-sm text-text-muted hover:text-text transition-colors mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          back
        </button>
      )}

      {/* folders */}
      {folders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
            folders
          </h2>
          <div className="flex flex-wrap gap-2">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => openFolder(f.id)}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 hover:border-text-muted transition-colors text-sm"
              >
                <span className="text-lg">📁</span>
                <span className="text-text">{f.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* video playlist */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
          videos <span className="font-normal">({files.length})</span>
        </h2>

        <div className="flex flex-col gap-0.5">
          {files.map((f, i) => {
            const p = progress[f.id];
            return (
              <Link
                key={f.id}
                href={`/watch/${encodeURIComponent(f.id)}`}
                className="group flex items-center gap-2 sm:gap-4 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-surface-raised transition-colors border border-transparent hover:border-border"
              >
                {/* number */}
                <span className="w-5 sm:w-7 text-center text-xs sm:text-sm font-mono text-text-muted flex-shrink-0">
                  {i + 1}
                </span>

                {/* thumbnail */}
                <div className="w-28 sm:w-40 flex-shrink-0 aspect-video bg-surface-card rounded overflow-hidden relative">
                  <ThumbnailImg
                    file={f}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    iconSize="sm"
                  />
                  <ProgressBadge progress={p} />
                </div>

                {/* title + meta */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-text truncate group-hover:text-white transition-colors">
                    {formatTitle(f.name)}
                  </p>
                  {f.modifiedTime && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(f.modifiedTime).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {/* duration / size */}
                {f.size > 0 && (
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {formatSize(f.size)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}
