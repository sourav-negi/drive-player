// ------------------------------------------------------------------
// drive-pleya — display helpers
// ------------------------------------------------------------------

/**
 * Format a raw filename for display.
 *   001_hello_video.mp4  →  1. Hello Video
 */
export function formatTitle(filename: string): string {
  // strip extension
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;

  // match patterns like "001_hello_video" or "01_something"
  const match = stem.match(/^0*(\d+)_(.+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const name = match[2]
      .replace(/_+/g, " ")          // underscores → spaces
      .replace(/\b\w/g, (c) => c.toUpperCase());  // title case
    return `${num}. ${name}`;
  }

  // no number prefix — just clean up underscores
  return stem.replace(/_+/g, " ");
}
