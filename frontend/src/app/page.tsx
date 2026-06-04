"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { progressStore } from "@/lib/progressStore";
import type { VideoFile, Folder, WatchProgress } from "@/lib/types";
import { UiState } from "@/components/UiState";
import { FileGrid } from "@/components/FileGrid";
import { VideoCard } from "@/components/VideoCard";

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
    <div>
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

      {/* sections */}
      {folders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-text-muted uppercase tracking-wide mb-3">
            folders
          </h2>
          <FileGrid>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => openFolder(f.id)}
                className="block rounded-lg border border-border bg-surface-raised p-4 hover:border-text-muted transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📁</span>
                  <span className="text-sm font-medium text-text truncate">
                    {f.name}
                  </span>
                </div>
              </button>
            ))}
          </FileGrid>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-text-muted uppercase tracking-wide mb-3">
          videos{" "}
          <span className="font-normal text-text-muted">({files.length})</span>
        </h2>
        <FileGrid>
          {files.map((f) => (
            <VideoCard key={f.id} file={f} progress={progress[f.id]} />
          ))}
        </FileGrid>
      </section>
    </div>
  );
}
