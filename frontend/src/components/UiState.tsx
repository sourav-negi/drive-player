// ------------------------------------------------------------------
// drive-pleya — unified loading / error / empty state component
// ------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { UiStatus } from "@/lib/types";
import { ApiError } from "@/lib/api";

interface Props {
  status: UiStatus;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  /** If the error is a cold start, show a friendlier "waking up" message. */
  error?: unknown;
  onRetry?: () => void;
  children?: ReactNode;
}

export function UiState({
  status,
  loadingMessage = "loading...",
  errorMessage = "something went wrong",
  emptyMessage = "nothing here",
  error,
  onRetry,
  children,
}: Props) {
  // ---- auto-retry for cold starts ----
  const retryCountRef = useRef(0);
  const [retrying, setRetrying] = useState(false);

  const isColdStart =
    error instanceof ApiError && error.coldStart;

  useEffect(() => {
    if (!isColdStart || !onRetry) return;
    retryCountRef.current = 0;
    setRetrying(true);

    // retry every 6 seconds, up to 8 times (~48 seconds total)
    const interval = setInterval(() => {
      retryCountRef.current++;
      if (retryCountRef.current >= 8) {
        clearInterval(interval);
        setRetrying(false);
        return;
      }
      onRetry();
    }, 6_000);

    return () => clearInterval(interval);
  }, [isColdStart, onRetry]);

  // ---- loading ----
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        <p className="text-text-muted text-sm">{loadingMessage}</p>
      </div>
    );
  }

  // ---- cold start (error, but specifically a Render wake-up) ----
  if (status === "error" && isColdStart) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
        <p className="text-text text-sm font-medium">waking up the server...</p>
        <p className="text-text-muted text-xs text-center max-w-sm">
          the backend is hosted on a free tier that sleeps after inactivity.
          {retrying
            ? ` auto-retrying (${retryCountRef.current + 1}/8)...`
            : " this may take up to a minute."}
        </p>
        {!retrying && onRetry && (
          <button
            onClick={() => { retryCountRef.current = 0; setRetrying(true); onRetry(); }}
            className="mt-2 rounded-lg bg-surface-raised border border-border px-4 py-2 text-sm text-text hover:bg-surface-card transition-colors"
          >
            retry
          </button>
        )}
      </div>
    );
  }

  // ---- error (generic) ----
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">⚠</div>
        <p className="text-text-muted text-sm">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 rounded-lg bg-surface-raised border border-border px-4 py-2 text-sm text-text hover:bg-surface-card transition-colors"
          >
            retry
          </button>
        )}
      </div>
    );
  }

  // ---- empty ----
  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-4xl">📁</div>
        <p className="text-text-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // success — render children
  return <>{children}</>;
}
