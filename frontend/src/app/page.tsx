"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { progressStore } from "@/lib/progressStore";
import { formatTitle } from "@/lib/format";
import { ProgressBadge } from "@/components/ProgressBadge";
import type { VideoFile, Folder, WatchProgress } from "@/lib/types";
import { UiState } from "@/components/UiState";

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, WatchProgress>>({});
  const [status, setStatus] = useState<"loading" | "error" | "empty" | "success">("loading");
  const [error, setError] = useState("");

  const fetchData = async (folderId?: string) => {
    setStatus("loading");
    setError("");
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
      setError(err instanceof Error ? err.message : "something went wrong");
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
        errorMessage={error}
        emptyMessage="no videos found on drive"
        onRetry={() => fetchData(currentFolder ?? undefined)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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

        <div className="flex flex-col">
          {files.map((f, i) => {
            const p = progress[f.id];
            return (
              <Link
                key={f.id}
                href={`/watch/${encodeURIComponent(f.id)}`}
                className="group flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-surface-raised transition-colors border border-transparent hover:border-border"
              >
                {/* number */}
                <span className="w-7 text-center text-sm font-mono text-text-muted flex-shrink-0">
                  {i + 1}
                </span>

                {/* thumbnail */}
                <div className="w-40 flex-shrink-0 aspect-video bg-surface-card rounded overflow-hidden relative">
                  {f.thumbnailLink ? (
                    <img
                      src={f.thumbnailLink}
                      alt={f.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                      </svg>
                    </div>
                  )}
                  <ProgressBadge progress={p} />
                </div>

                {/* title + meta */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate group-hover:text-white transition-colors">
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
