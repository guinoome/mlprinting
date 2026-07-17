/**
 * Deterministic placeholder artwork.
 *
 * ML Printing has not supplied template artwork, and Ph2.md's Out of Scope
 * forbids media upload — so the marketplace needs cover images it cannot yet
 * be given. This generates them: same slug in, same picture out, no files, no
 * network, no upload path.
 *
 * These are scaffolding with an expiry date. When real artwork arrives it
 * replaces `Template.coverImageUrl` and `TemplateScreenshot.url` with real
 * paths, this module stops being called, and it should be deleted rather than
 * left to rot as a fallback nobody notices is still rendering.
 *
 * Pure and framework-free: the route handler in app/ turns the string into a
 * response, and this file has no idea a request exists.
 */

/**
 * FNV-1a. A hash, not a secure one — the only requirement is that a slug maps
 * to the same picture every time and that similar slugs look different.
 * Deliberately not crypto: this runs per image request.
 */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/**
 * Muted, print-plausible palettes. Chosen to look like stationery rather than a
 * developer's placeholder grid: nobody should mistake these for real designs,
 * but nobody should wince at them either.
 */
const PALETTES: { bg: string; fg: string; accent: string }[] = [
  { bg: "#f5efe8", fg: "#3f3a35", accent: "#c9a227" }, // ivory / gold
  { bg: "#f7eef0", fg: "#4a3a3f", accent: "#c98c9c" }, // blush
  { bg: "#eef2f0", fg: "#2f3a37", accent: "#7fa295" }, // sage
  { bg: "#eef0f5", fg: "#333a4a", accent: "#8595c9" }, // dusk
  { bg: "#f3f0ea", fg: "#3a382f", accent: "#a8a06a" }, // olive
  { bg: "#f6f1f6", fg: "#413848", accent: "#a98cc9" }, // lilac
];

export interface PlaceholderOptions {
  /** Drives colour and motif. Same seed, same image. */
  seed: string;
  /** Rendered as the centrepiece. */
  label: string;
  /** Small caption under the label — usually the category. */
  caption?: string;
  width: number;
  height: number;
}

/** Escape text for XML. The label is data; without this a quote in a template name breaks the document. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Initial glyph for the motif — first letter, or a dot for an empty label. */
function glyphFor(label: string): string {
  const first = label.trim()[0];
  return first ? escapeXml(first.toUpperCase()) : "·";
}

/**
 * An SVG cover.
 *
 * SVG rather than a raster: it is a few hundred bytes, scales to any card size
 * without a second asset, and needs no image pipeline. It is served from a
 * route handler with an immutable cache header, so the cost is paid once.
 */
export function placeholderCover({
  seed,
  label,
  caption,
  width,
  height,
}: PlaceholderOptions): string {
  const h = hash(seed);
  const palette = PALETTES[h % PALETTES.length]!;
  const rotation = (h >> 8) % 24;

  const inset = Math.round(Math.min(width, height) * 0.06);
  const glyphSize = Math.round(Math.min(width, height) * 0.24);
  const labelSize = Math.max(11, Math.round(Math.min(width, height) * 0.058));
  const captionSize = Math.max(9, Math.round(labelSize * 0.62));

  // Wordmark sits low; the glyph is the hero. Rotation is the only per-seed
  // geometry — enough to distinguish cards at a glance without pretending to be
  // a real design.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(label)} placeholder artwork">
  <rect width="${width}" height="${height}" fill="${palette.bg}"/>
  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.55"/>
  <g transform="rotate(${rotation} ${width / 2} ${height * 0.42})" opacity="0.14">
    <circle cx="${width / 2}" cy="${height * 0.42}" r="${glyphSize * 0.95}" fill="none" stroke="${palette.fg}" stroke-width="1.5"/>
    <circle cx="${width / 2}" cy="${height * 0.42}" r="${glyphSize * 0.62}" fill="none" stroke="${palette.fg}" stroke-width="1"/>
  </g>
  <text x="${width / 2}" y="${height * 0.42}" fill="${palette.accent}" font-family="Georgia, 'Times New Roman', serif" font-size="${glyphSize}" text-anchor="middle" dominant-baseline="central">${glyphFor(label)}</text>
  <text x="${width / 2}" y="${height * 0.72}" fill="${palette.fg}" font-family="Georgia, 'Times New Roman', serif" font-size="${labelSize}" text-anchor="middle">${escapeXml(label)}</text>
  ${
    caption
      ? `<text x="${width / 2}" y="${height * 0.72 + captionSize * 2}" fill="${palette.fg}" font-family="system-ui, sans-serif" font-size="${captionSize}" letter-spacing="1.5" text-anchor="middle" opacity="0.6">${escapeXml(caption.toUpperCase())}</text>`
      : ""
  }
</svg>`;
}

/** Canonical sizes per surface — Ph2.md §6 requires desktop, mobile, and print previews. */
export const PLACEHOLDER_SIZES = {
  cover: { width: 600, height: 750 },
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
  print: { width: 600, height: 850 },
} as const;

export type PlaceholderSurface = keyof typeof PLACEHOLDER_SIZES;

export function isPlaceholderSurface(
  value: string,
): value is PlaceholderSurface {
  return value in PLACEHOLDER_SIZES;
}

/** The URL a template row stores for generated artwork. */
export function placeholderUrl(
  surface: PlaceholderSurface,
  seed: string,
  label: string,
  caption?: string,
): string {
  const params = new URLSearchParams({ label });
  if (caption) params.set("caption", caption);
  return `/api/placeholder/${surface}/${encodeURIComponent(seed)}?${params.toString()}`;
}
