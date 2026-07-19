import sharp from "sharp";

/**
 * Image processing — design doc Decision 4's "Processing pipeline" section.
 *
 * Pure with respect to the outside world: takes bytes, returns bytes, no
 * storage or database access, so it is unit-testable with synthetic images and
 * needs neither a fixture file nor a database.
 *
 * Re-encoding to WebP is what strips EXIF/GPS metadata (design doc §5) — a side
 * effect of generating the thumbnail, not a separate step.
 */

const THUMBNAIL_LONGEST_EDGE = 320;
const PREVIEW_LONGEST_EDGE = 1280;
const WEBP_QUALITY = 82;

export interface ProcessedVariant {
  buffer: Buffer;
  contentType: "image/webp";
}

export interface ProcessedImage {
  width: number;
  height: number;
  thumbnail: ProcessedVariant;
  preview: ProcessedVariant;
}

async function resizeToWebp(
  input: Buffer,
  longestEdge: number,
): Promise<Buffer> {
  return sharp(input)
    .resize({
      width: longestEdge,
      height: longestEdge,
      fit: "inside",
      // A phone photo already smaller than the target must not be blown up —
      // that would manufacture detail that was never in the original.
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/**
 * Generate thumbnail and preview variants for an uploaded image.
 *
 * Returns null when the input can't be decoded — HEIC support depends on the
 * `sharp` build (design doc's "Known, currently-unresolved format-support
 * gap"). Callers must treat null as "keep the original, skip variants," never
 * as a reason to fail the whole upload.
 */
export async function processImage(
  input: Buffer,
): Promise<ProcessedImage | null> {
  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) return null;

    const [thumbnail, preview] = await Promise.all([
      resizeToWebp(input, THUMBNAIL_LONGEST_EDGE),
      resizeToWebp(input, PREVIEW_LONGEST_EDGE),
    ]);

    return {
      width: metadata.width,
      height: metadata.height,
      thumbnail: { buffer: thumbnail, contentType: "image/webp" },
      preview: { buffer: preview, contentType: "image/webp" },
    };
  } catch {
    return null;
  }
}
