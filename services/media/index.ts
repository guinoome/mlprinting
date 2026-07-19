import "server-only";

import { logger } from "@/lib/logger";
import { isDatabaseConfigured } from "@/lib/db";
import { extensionOf } from "@/services/upload";
import { BUCKETS } from "@/services/upload/storage";
import { processImage } from "./processing";
import { assetObjectPath, hasVariants } from "./paths";
import { writeAssetObjects, removeAssetObjects } from "./storage";
import {
  insertAsset,
  findAssetById,
  searchAssets as repoSearchAssets,
  listAllAssets,
  findUsagesForProfile,
  bumpVersionAndUpdate,
  updateAssetMeta as repoUpdateAssetMeta,
  deleteAssetRow,
  findBlockingUsages,
  getQuota as repoGetQuota,
} from "./repository";
import { computeByEvent, computeByType } from "./folders";
import { parseMediaCriteria } from "./criteria";
import type { MediaCriteria, RawSearchParams } from "./criteria";
import type { AssetRow, MediaVariant } from "./types";

/**
 * Media service — Ph4's Invitation Media Library (Ph4.md §15: "other modules
 * depend on the Media Library," never the reverse). Extends the seam Phase 3
 * introduced (see git history for services/media/index.ts's Phase 3 version)
 * with folders, search, image processing, versioned replace, and storage
 * quota, per docs/superpowers/specs/2026-07-18-phase4-media-library-design.md.
 */

export type { AssetRow, MediaVariant, AssetUsage } from "./types";
export type {
  MediaCriteria,
  RawSearchParams,
  MediaSort,
  MediaKindFilter,
} from "./criteria";
export {
  parseMediaCriteria,
  MEDIA_SORTS,
  MEDIA_KINDS,
  DEFAULT_MEDIA_SORT,
  DEFAULT_MEDIA_PAGE_SIZE,
} from "./criteria";
export type { ByEventView, ByTypeView, EventFolder } from "./folders";
export type { Quota, QuotaByEvent } from "./repository";
export { hasVariants, assetObjectPath } from "./paths";

/**
 * Proxy URL for one variant of one asset — never a Supabase signed URL
 * (design doc Decision 4: signed URLs rotate on every mint, which defeats
 * immutable caching for a grid of thumbnails).
 */
export function assetVariantUrl(
  asset: { id: string; version: number },
  variant: MediaVariant = "original",
): string {
  return `/api/media/${asset.id}/${asset.version}/${variant}`;
}

/** The right-sized URL for a grid thumbnail, falling back to the original when no variants exist. */
export function thumbnailUrl(asset: {
  id: string;
  version: number;
  width: number | null;
}): string {
  return assetVariantUrl(asset, hasVariants(asset) ? "thumbnail" : "original");
}

/** The right-sized URL for a detail view or builder preview, falling back to the original when no variants exist. */
export function previewUrl(asset: {
  id: string;
  version: number;
  width: number | null;
}): string {
  return assetVariantUrl(asset, hasVariants(asset) ? "preview" : "original");
}

function objectPathsFor(
  profileId: string,
  assetId: string,
  version: number,
  originalExtension: string,
  includeVariants: boolean,
): string[] {
  return [
    assetObjectPath(profileId, assetId, version, "original", originalExtension),
    ...(includeVariants
      ? [
          assetObjectPath(profileId, assetId, version, "thumbnail", originalExtension),
          assetObjectPath(profileId, assetId, version, "preview", originalExtension),
        ]
      : []),
  ];
}

export interface CreateAssetInput {
  profileId: string;
  file: File;
  altText?: string;
  tags?: string[];
}

export type CreateAssetResult =
  | { ok: true; assetId: string }
  | { ok: false; error: string };

/**
 * Store a file and record it as an asset — design doc's processing pipeline.
 * Runs `sharp` to generate thumbnail/preview variants; degrades to
 * original-only when the input can't be decoded (Decision 4). Path is derived
 * from the owner's id and a fresh random asset id, never from anything the
 * caller supplies — same reasoning as Phase 3's version of this function.
 */
export async function createAsset({
  profileId,
  file,
  altText,
  tags = [],
}: CreateAssetInput): Promise<CreateAssetResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Media is not available on this deployment." };
  }

  const assetId = crypto.randomUUID();
  const extension = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer);

  const writes = [
    {
      variant: "original" as const,
      path: assetObjectPath(profileId, assetId, 1, "original", extension),
      buffer,
      contentType: file.type,
    },
    ...(processed
      ? [
          {
            variant: "thumbnail" as const,
            path: assetObjectPath(profileId, assetId, 1, "thumbnail", extension),
            buffer: processed.thumbnail.buffer,
            contentType: processed.thumbnail.contentType,
          },
          {
            variant: "preview" as const,
            path: assetObjectPath(profileId, assetId, 1, "preview", extension),
            buffer: processed.preview.buffer,
            contentType: processed.preview.contentType,
          },
        ]
      : []),
  ];

  const written = await writeAssetObjects(writes);
  if (!written.ok) {
    await removeAssetObjects(written.written);
    return { ok: false, error: written.error };
  }

  try {
    const asset = await insertAsset({
      id: assetId,
      profileId,
      bucket: BUCKETS.media,
      storagePath: writes[0].path,
      kind: "IMAGE",
      mimeType: file.type,
      bytes: file.size,
      originalFilename: file.name.slice(0, 200),
      altText: altText?.trim() || null,
      tags,
      width: processed?.width ?? null,
      height: processed?.height ?? null,
    });

    return { ok: true, assetId: asset.id };
  } catch (error) {
    // The bytes landed but the record did not. Remove every object just
    // written rather than leave storage holding an orphan nothing points at.
    logger.report(error, { at: "createAsset", profileId });
    await removeAssetObjects(writes.map((w) => w.path));
    return {
      ok: false,
      error: "Could not save that image. Please try again.",
    };
  }
}

export type ReplaceAssetResult = { ok: true } | { ok: false; error: string };

/**
 * Replace an asset in place — design doc Decision 2. Same id, new bytes,
 * version incremented. The new version's objects are written and the row is
 * confirmed updated *before* the previous version's objects are removed —
 * never the reverse, per the design doc's error-handling cross-reference.
 */
export async function replaceAsset(
  profileId: string,
  assetId: string,
  file: File,
): Promise<ReplaceAssetResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Media is not available on this deployment." };
  }

  const existing = await findAssetById(profileId, assetId);
  if (!existing) return { ok: false, error: "That image no longer exists." };

  const nextVersion = existing.version + 1;
  const extension = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer);

  const writes = [
    {
      variant: "original" as const,
      path: assetObjectPath(profileId, assetId, nextVersion, "original", extension),
      buffer,
      contentType: file.type,
    },
    ...(processed
      ? [
          {
            variant: "thumbnail" as const,
            path: assetObjectPath(profileId, assetId, nextVersion, "thumbnail", extension),
            buffer: processed.thumbnail.buffer,
            contentType: processed.thumbnail.contentType,
          },
          {
            variant: "preview" as const,
            path: assetObjectPath(profileId, assetId, nextVersion, "preview", extension),
            buffer: processed.preview.buffer,
            contentType: processed.preview.contentType,
          },
        ]
      : []),
  ];

  const written = await writeAssetObjects(writes);
  if (!written.ok) {
    await removeAssetObjects(written.written);
    return { ok: false, error: written.error };
  }

  try {
    await bumpVersionAndUpdate(assetId, {
      bucket: BUCKETS.media,
      storagePath: writes[0].path,
      mimeType: file.type,
      bytes: file.size,
      originalFilename: file.name.slice(0, 200),
      width: processed?.width ?? null,
      height: processed?.height ?? null,
    });
  } catch (error) {
    logger.report(error, { at: "replaceAsset", profileId, assetId });
    await removeAssetObjects(writes.map((w) => w.path));
    return {
      ok: false,
      error: "Could not replace that image. Please try again.",
    };
  }

  // Only now — new objects written, row confirmed updated — remove the
  // previous version's objects.
  const previousPaths = objectPathsFor(
    profileId,
    assetId,
    existing.version,
    extensionOf(existing.originalFilename),
    hasVariants(existing),
  );
  await removeAssetObjects(previousPaths);

  return { ok: true };
}

export type DeleteAssetResult =
  | { ok: true }
  | { ok: false; error: string; usedBy?: string[] };

/**
 * Delete an asset — Ph4.md §11 (Delete Protection). Extends Phase 3's version
 * of this function to remove up to three storage objects instead of one.
 */
export async function deleteAsset(
  profileId: string,
  assetId: string,
): Promise<DeleteAssetResult> {
  if (!isDatabaseConfigured())
    return { ok: false, error: "Media is not available." };

  const asset = await findAssetById(profileId, assetId);
  if (!asset) return { ok: false, error: "That image no longer exists." };

  const usedBy = await findBlockingUsages(assetId);
  if (usedBy.length > 0) {
    return {
      ok: false,
      error: "That image is still used by an invitation.",
      usedBy,
    };
  }

  try {
    await deleteAssetRow(asset.id);
  } catch (error) {
    logger.report(error, { at: "deleteAsset", profileId, assetId });
    return {
      ok: false,
      error: "Could not delete that image. Please try again.",
    };
  }

  // Row deleted last-but-storage-removed-last-of-all would leave a dangling
  // row if storage cleanup crashed; row-then-storage means the worst case is
  // an orphaned file, which costs kilobytes and is invisible to any user.
  const paths = objectPathsFor(
    profileId,
    assetId,
    asset.version,
    extensionOf(asset.originalFilename),
    hasVariants(asset),
  );
  await removeAssetObjects(paths);

  return { ok: true };
}

export async function getAsset(
  profileId: string,
  assetId: string,
): Promise<AssetRow | null> {
  return findAssetById(profileId, assetId);
}

/** A customer's assets, newest first, unpaginated — used by the builder's media step and by folder computation, which both need the whole pool. */
export async function listAssets(profileId: string): Promise<AssetRow[]> {
  return listAllAssets(profileId);
}

export interface SearchAssetsResult {
  assets: AssetRow[];
  totalCount: number;
  criteria: MediaCriteria;
}

/** Ph4.md §8 — filename, tags, media type, upload date, and event, via services/media/criteria.ts + query.ts. */
export async function searchAssets(
  profileId: string,
  rawParams: RawSearchParams,
): Promise<SearchAssetsResult> {
  const criteria = parseMediaCriteria(rawParams);
  const { assets, totalCount } = await repoSearchAssets(profileId, criteria);
  return { assets, totalCount, criteria };
}

export interface FoldersResult {
  byEvent: ReturnType<typeof computeByEvent>;
  byType: ReturnType<typeof computeByType>;
}

/** Design doc Decision 1 — computed at read time from the current asset pool and usage join, never stored. */
export async function getFolders(
  profileId: string,
  assets: AssetRow[],
): Promise<FoldersResult> {
  const usages = await findUsagesForProfile(profileId);

  return {
    byEvent: computeByEvent(
      assets.map((asset) => asset.id),
      usages,
    ),
    byType: computeByType(
      assets.map((asset) => ({ id: asset.id, tags: asset.tags })),
    ),
  };
}

export async function getQuota(profileId: string) {
  return repoGetQuota(profileId);
}

export async function updateAssetMeta(
  profileId: string,
  assetId: string,
  data: { altText?: string | null; tags?: string[] },
): Promise<AssetRow | null> {
  return repoUpdateAssetMeta(profileId, assetId, data);
}
