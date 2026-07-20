/**
 * Text measurement and wrapping — Ph6.md §5, §9.
 *
 * Pure, with measurement injected: the caller passes a function backed by the
 * real embedded font (pdf-lib's widthOfTextAtSize), and tests pass a
 * deterministic stub. That is what makes overflow detection exact rather than
 * estimated — and overflow on a printed card is not recoverable after the run.
 */

/** Width of `text` at `size`, in points. */
export type MeasureFn = (text: string, size: number) => number;

export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  measure: MeasureFn,
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate, size) <= maxWidth || !current) {
        // `!current` keeps a single over-long word on its own line instead of
        // looping forever trying to fit it.
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export interface FitResult {
  fits: boolean;
  lines: string[];
  requiredHeight: number;
}

export function fitsInBox(
  text: string,
  box: { width: number; height: number },
  size: number,
  lineHeightRatio: number,
  measure: MeasureFn,
): FitResult {
  const lines = wrapText(text, box.width, size, measure);
  const requiredHeight = lines.length * size * lineHeightRatio;
  return { fits: requiredHeight <= box.height, lines, requiredHeight };
}
