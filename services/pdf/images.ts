import "server-only";

import sharp from "sharp";
import { assetObjectPath } from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";
import type { AssetRow } from "@/services/media";
import type { Box } from "./types";

/**
 * Print image pipeline — Ph6.md §4, §6.
 *
 * Always reads the ORIGINAL asset, never a thumbnail or the 1280px preview
 * variant: a preview is far below 300 DPI at card size, and silently printing
 * one is exactly the failure this phase exists to prevent.
 */

export const PRINT_DPI = 300;

/** Pixels needed to fill `box` (points) at `dpi`. */
export function requiredPixelsFor(box: Box, dpi = PRINT_DPI) {
  return {
    width: Math.ceil((box.width / 72) * dpi),
    height: Math.ceil((box.height / 72) * dpi),
  };
}

export interface PreparedImage {
  bytes: Uint8Array;
  /** "jpeg" unless the Task 1 spike forced a different container. */
  format: "jpeg" | "png";
}

/**
 * Fetch the original, cover-crop to the box's aspect ratio, resize to the
 * exact pixel size 300 DPI needs, and convert to CMYK.
 *
 * Aspect ratio is always preserved (Ph6.md §6) — `fit: "cover"` crops the
 * overflow rather than distorting the photograph.
 */
export async function prepareImage(
  asset: AssetRow,
  box: Box,
): Promise<PreparedImage | null> {
  const path = assetObjectPath(
    asset.profileId,
    asset.id,
    asset.version,
    "original",
    extensionOf(asset.originalFilename),
  );

  const url = await signedUrl(asset.bucket as "media" | "avatars", path, 60);
  if (!url) return null;

  const upstream = await fetch(url);
  if (!upstream.ok) return null;
  const input = Buffer.from(await upstream.arrayBuffer());

  const target = requiredPixelsFor(box);
  const bytes = await sharp(input)
    .resize({ width: target.width, height: target.height, fit: "cover" })
    .toColourspace("cmyk")
    // 4:4:4 is deliberate: the default 4:2:0 discards colour detail that is
    // invisible on screen and visible in print.
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return { bytes: new Uint8Array(bytes), format: "jpeg" };
}
