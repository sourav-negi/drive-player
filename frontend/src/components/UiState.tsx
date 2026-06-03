// ------------------------------------------------------------------
// drive-pleya — unified loading / error / empty state component
// ------------------------------------------------------------------

import type { UiStatus } from "@/lib/types";

interface Props {
  status: UiStatus;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function UiState({
  status,
  loadingMessage = "loading...",
  errorMessage = "something went wrong",
  emptyMessage = "nothing here",
  onRetry,
  children,
}: Props) {
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        <p className="text-text-muted text-sm">{loadingMessage}</p>
      </div>
    );
  }

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
