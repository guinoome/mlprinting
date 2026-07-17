import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  uploadFile,
  removeFile,
  signedUrl,
  BUCKETS,
} from "@/services/upload/storage";
import { extensionOf } from "@/services/upload";
import type { UploadFailure } from "@/services/upload";

/**
 * Media service — the seam Ph4's Invitation Media Library will own.
 *
 * WHY THIS EXISTS IN PHASE 3
 *
 * Ph3.md §7 says "Connect to the Invitation Media Library" and the Success
 * Criteria require "Upload media" — but the Library is Phase 4. Phase 3 cannot
 * be built without somewhere to put a cover photo, and inventing a private
 * store would give Ph4 something to unpick rather than something to build on.
 *
 * So this is the minimum the Library will own, shaped to the contract Ph4.md
 * already specifies:
 *
 *   §15  "The Media Library should never depend on these consumers. Instead,
 *        other modules depend on the Media Library."  → this lives in services/,
 *        imports no feature, and features call it.
 *   §9   "Avoid duplicate uploads. Multiple invitation sections may reference
 *        the same asset."                              → assets are records;
 *                                                        invitations join to them.
 *   §10  "Replace an asset while preserving references." → callers hold an id,
 *                                                          never a URL.
 *   §11  "Prevent deleting assets still referenced."     → deletion checks usage.
 *
 * WHAT PHASE 4 ADDS: folders, image processing and variants, an asset browser,
 * search, storage quotas, and the usage UI. None of that changes this contract —
 * which is the point of writing it down now.
 */

export interface CreateAssetInput {
  profileId: string;
  file: File;
  altText?: string;
}

export type CreateAssetResult =
  { ok: true; assetId: string } | { ok: false; error: string };

/**
 * Store a file and record it as an asset.
 *
 * Path is derived from the owner's id, never from anything the caller supplies:
 * the prefix is what Supabase's row-level security matches on, so a
 * caller-chosen path would be a caller-chosen access policy.
 * See docs/deployment-workflow.md for the bucket policies.
 */
export async function createAsset({
  profileId,
  file,
  altText,
}: CreateAssetInput): Promise<CreateAssetResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Media is not available on this deployment." };
  }

  // A random object name, not the original filename. Two customers uploading
  // "cover.jpg" must not collide, and a filename is attacker-influenced input
  // that has no business shaping a storage path.
  const extension = extensionOf(file.name);
  const objectName = `${crypto.randomUUID()}${extension}`;
  const path = `${profileId}/${objectName}`;

  const uploaded = await uploadFile({
    bucket: BUCKETS.media,
    path,
    file,
    kind: "image",
  });

  if ("code" in uploaded) {
    return { ok: false, error: (uploaded as UploadFailure).message };
  }

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        profileId,
        bucket: BUCKETS.media,
        storagePath: uploaded.path,
        kind: "IMAGE",
        mimeType: uploaded.contentType,
        bytes: uploaded.bytes,
        originalFilename: file.name.slice(0, 200),
        altText: altText?.trim() || null,
      },
      select: { id: true },
    });

    return { ok: true, assetId: asset.id };
  } catch (error) {
    // The bytes landed but the record did not. Remove the orphan rather than
    // leave a file nothing points at and nobody can find.
    logger.report(error, { at: "createAsset", profileId });
    await removeFile(BUCKETS.media, uploaded.path);
    return { ok: false, error: "Could not save that image. Please try again." };
  }
}

/** A customer's assets, newest first. Ph4 replaces this with the browser (§7) and search (§8). */
export async function listAssets(profileId: string, limit = 60) {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.mediaAsset.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        bucket: true,
        storagePath: true,
        altText: true,
        originalFilename: true,
        bytes: true,
        width: true,
        height: true,
      },
    });
  } catch (error) {
    logger.report(error, { at: "listAssets", profileId });
    return [];
  }
}

/**
 * A viewable URL for an asset.
 *
 * Signed and short-lived: the media bucket is private, and a permanent link to a
 * customer's family photos is a public one with extra characters. Callers must
 * not cache the result past its expiry.
 */
export async function assetUrl(
  asset: { bucket: string; storagePath: string },
  expiresInSeconds = 3600,
): Promise<string | null> {
  return signedUrl(
    asset.bucket as "media" | "avatars",
    asset.storagePath,
    expiresInSeconds,
  );
}

/** Resolve URLs for a set of assets in one pass. */
export async function assetUrls(
  assets: { id: string; bucket: string; storagePath: string }[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    assets.map(async (asset) => [asset.id, await assetUrl(asset)] as const),
  );

  return new Map(
    entries.filter(
      (entry): entry is readonly [string, string] => entry[1] !== null,
    ),
  );
}

export type DeleteAssetResult =
  { ok: true } | { ok: false; error: string; usedBy?: string[] };

/**
 * Delete an asset — Ph4.md §11 (Delete Protection).
 *
 * Refuses while anything still references it, and names what. The schema's
 * `onDelete: Restrict` would raise a foreign-key error anyway; this turns that
 * into an answer the customer can act on. Ph4 builds the dialog around it.
 */
export async function deleteAsset(
  profileId: string,
  assetId: string,
): Promise<DeleteAssetResult> {
  if (!isDatabaseConfigured())
    return { ok: false, error: "Media is not available." };

  try {
    // Scoped to the owner: this is the check that stops one customer deleting
    // another's photo by id.
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: assetId, profileId },
      select: { id: true, bucket: true, storagePath: true },
    });
    if (!asset) return { ok: false, error: "That image no longer exists." };

    const usages = await prisma.invitationMedia.findMany({
      where: { assetId },
      select: { invitation: { select: { title: true } } },
      take: 10,
    });

    if (usages.length > 0) {
      return {
        ok: false,
        error: "That image is still used by an invitation.",
        usedBy: usages.map((usage) => usage.invitation.title),
      };
    }

    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    // Storage last: an orphaned row pointing at a missing file renders broken,
    // while an orphaned file costs a few kilobytes and no user ever sees it.
    await removeFile(asset.bucket as "media" | "avatars", asset.storagePath);

    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "deleteAsset", profileId, assetId });
    return {
      ok: false,
      error: "Could not delete that image. Please try again.",
    };
  }
}
