// ------------------------------------------------------------------
// drive-pleya — progress bar badge for video cards
// ------------------------------------------------------------------

import type { WatchProgress } from "@/lib/types";

interface Props {
  progress?: WatchProgress;
}

export function ProgressBadge({ progress }: Props) {
  if (!progress) return null;

  const { percentage, completed } = progress;

  return (
    <>
      {/* thin progress bar at bottom */}
      {percentage > 0 && !completed && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {/* "watched" badge */}
      {completed && (
        <span className="absolute top-2 right-2 bg-green-600 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
          watched
        </span>
      )}
    </>
  );
}
