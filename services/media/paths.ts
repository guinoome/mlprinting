import type { MediaVariant } from "./types";

/**
 * Pure storage-path builder for media objects — no I/O, so it is trivially
 * unit-testable and is the single place that decides the on-disk layout.
 *
 * Layout: `{profileId}/{assetId}/v{version}/{variant}.{ext}`. The version segment
 * is what makes `Cache-Control: immutable` safe (design doc Decision 4): a given
 * triple's bytes never change, because Replace always writes to `v{version + 1}`
 * and only deletes the old version's objects once the new ones are confirmed
 * written.
 */

const GENERATED_VARIANT_EXTENSION = ".webp";

export function assetObjectPath(
  profileId: string,
  assetId: string,
  version: number,
  variant: MediaVariant,
  originalExtension: string,
): string {
  const extension =
    variant === "original" ? originalExtension : GENERATED_VARIANT_EXTENSION;
  return `${profileId}/${assetId}/v${version}/${variant}${extension}`;
}

/**
 * The sole signal that thumbnail/preview variants exist for an asset (design
 * doc Decision 4) — there is no variants table, so this is derived from a field
 * populated only on a successful `sharp` decode. Callers building a thumbnail or
 * preview URL must check this first and fall back to `"original"` when false,
 * rather than requesting a variant path and handling a storage 404.
 */
export function hasVariants(asset: { width: number | null }): boolean {
  return asset.width !== null;
}
