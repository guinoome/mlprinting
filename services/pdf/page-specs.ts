import type { Box, PdfSizeSlug } from "./types";

/**
 * Page geometry — Ph6.md §2, §3. Sizes are data; the layout that uses them is
 * code. Adding a paper size is an entry in this table and nothing else, which
 * is the extensibility the spec actually asks for.
 *
 * All values in PDF points (72 per inch), origin bottom-left.
 */

export const PT_PER_INCH = 72;
export const MM_TO_PT = PT_PER_INCH / 25.4;

/** Commercial standard: 3mm bleed, 5mm safe inset from trim. */
const BLEED_MM = 3;
const SAFE_INSET_MM = 5;

export interface PageSpec {
  slug: PdfSizeSlug;
  label: string;
  trimWidth: number;
  trimHeight: number;
  bleed: number;
  /** Full page including bleed — what the PDF page is actually sized to. */
  mediaWidth: number;
  mediaHeight: number;
  /** Where the finished card sits within the media box. */
  trimBox: Box;
  /** Nothing meaningful may be placed outside this. */
  safeBox: Box;
}

function build(
  slug: PdfSizeSlug,
  label: string,
  trimWidth: number,
  trimHeight: number,
): PageSpec {
  const bleed = BLEED_MM * MM_TO_PT;
  const safeInset = SAFE_INSET_MM * MM_TO_PT;

  return {
    slug,
    label,
    trimWidth,
    trimHeight,
    bleed,
    mediaWidth: trimWidth + bleed * 2,
    mediaHeight: trimHeight + bleed * 2,
    trimBox: { x: bleed, y: bleed, width: trimWidth, height: trimHeight },
    safeBox: {
      x: bleed + safeInset,
      y: bleed + safeInset,
      width: trimWidth - safeInset * 2,
      height: trimHeight - safeInset * 2,
    },
  };
}

export const PAGE_SPECS: Record<PdfSizeSlug, PageSpec> = {
  FIVE_BY_SEVEN: build(
    "FIVE_BY_SEVEN",
    '5 × 7"',
    5 * PT_PER_INCH,
    7 * PT_PER_INCH,
  ),
  A5: build("A5", "A5", 148 * MM_TO_PT, 210 * MM_TO_PT),
  A6: build("A6", "A6", 105 * MM_TO_PT, 148 * MM_TO_PT),
};

export function pageSpecFor(slug: PdfSizeSlug): PageSpec {
  return PAGE_SPECS[slug];
}
