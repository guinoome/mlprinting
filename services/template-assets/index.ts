import "server-only";
import { randomUUID } from "node:crypto";

import { logger } from "@/lib/logger";
import { isDatabaseConfigured } from "@/lib/db";
import { processImage } from "@/services/media/processing";
import {
  isTemplateStorageConfigured,
  objectPublicUrl,
  putObject,
  removeObjects,
} from "./storage";
import {
  TEMPLATE_ASSET_BUCKET,
  defaultDisplayName,
  templateAssetPath,
  templateThumbnailPath,
} from "./naming";
import { validateTemplateAsset } from "./constraints";
import {
  assignArtwork as repoAssign,
  deleteAssetAndRestoreCovers,
  findAsset,
  insertAsset,
  listAssets,
  listAssignableTemplates,
  unassignArtwork as repoUnassign,
} from "./repository";
import type {
  AssignableTemplate,
  TemplateAssetFailure,
  TemplateAssetRow,
} from "./types";

/**
 * Admin template artwork — Instructions 4.
 *
 * The escape hatch from procedurally generated covers. An administrator
 * uploads a design a person actually drew; assigning it overwrites the
 * catalogue row's `coverImageUrl`, so all twelve surfaces that render a cover
 * pick it up without knowing this feature exists.
 *
 * Built on services/upload and services/media rather than reaching for
 * Supabase or sharp directly, per Ph1.md §8 and Ph4.md §15 (features depend on
 * services, never the reverse).
 */

export type { TemplateAssetRow, AssignableTemplate, TemplateAssetFailure };
export { TEMPLATE_ASSET_BUCKET, defaultDisplayName } from "./naming";
export {
  MAX_TEMPLATE_ASSET_BYTES,
  TEMPLATE_ASSET_ACCEPT,
  TEMPLATE_ASSET_EXTENSIONS,
  TEMPLATE_ASSET_MIME_TYPES,
  validateTemplateAsset,
} from "./constraints";

export interface UploadTemplateAssetInput {
  file: File;
  /** Blank falls back to a title-cased filename. */
  name?: string;
  uploadedById: string | null;
}

export type UploadTemplateAssetResult =
  | { ok: true; asset: TemplateAssetRow }
  | { ok: false; failure: TemplateAssetFailure };

/**
 * Stores a design and records it.
 *
 * Order matters and is the whole reason this reads the way it does: bytes are
 * written first, the row second. A row without an object renders a broken
 * image on the public catalogue; an object without a row is a few kilobytes
 * nobody sees. So the recoverable failure is the one we allow, and if the
 * insert fails we delete what we just wrote rather than leave the pair
 * inconsistent.
 */
export async function uploadTemplateAsset({
  file,
  name,
  uploadedById,
}: UploadTemplateAssetInput): Promise<UploadTemplateAssetResult> {
  if (!isTemplateStorageConfigured()) {
    return {
      ok: false,
      failure: {
        code: "not-configured",
        message: "File storage is not configured on this deployment.",
      },
    };
  }
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      failure: {
        code: "not-configured",
        message: "The database is not configured on this deployment.",
      },
    };
  }

  const invalid = validateTemplateAsset({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (invalid) return { ok: false, failure: invalid };

  const id = randomUUID();
  const objectPath = templateAssetPath(id, file.name, new Date());

  let original: Buffer;
  try {
    original = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    logger.report(error, { at: "uploadTemplateAsset.read" });
    return {
      ok: false,
      failure: { code: "empty", message: "That file could not be read." },
    };
  }

  // Decoding also proves the bytes are the image they claim to be. A .png
  // extension with a PDF inside fails here, which is the check the header and
  // extension pair cannot make.
  const processed = await processImage(original);
  if (!processed) {
    return {
      ok: false,
      failure: {
        code: "unreadable-image",
        message:
          "That file could not be read as an image. Re-export it as JPG, PNG or WebP.",
      },
    };
  }

  const written: string[] = [];

  const uploaded = await putObject(objectPath, original, file.type);
  if (!uploaded.ok) {
    return {
      ok: false,
      failure: { code: "storage-error", message: uploaded.message },
    };
  }
  written.push(objectPath);

  // A missing thumbnail is a cosmetic loss the grid already handles, so it must
  // never fail an otherwise good upload.
  let thumbnailPath: string | null = templateThumbnailPath(objectPath);
  const thumb = await putObject(
    thumbnailPath,
    processed.thumbnail.buffer,
    processed.thumbnail.contentType,
  );
  if (!thumb.ok) {
    logger.report(new Error(thumb.message), {
      at: "uploadTemplateAsset.thumbnail",
    });
    thumbnailPath = null;
  } else {
    written.push(thumbnailPath);
  }

  try {
    const asset = await insertAsset({
      id,
      name: name?.trim() || defaultDisplayName(file.name),
      bucket: TEMPLATE_ASSET_BUCKET,
      storagePath: objectPath,
      thumbnailPath,
      originalFilename: file.name,
      mimeType: file.type,
      bytes: file.size,
      width: processed.width,
      height: processed.height,
      uploadedById,
    });
    return { ok: true, asset };
  } catch (error) {
    logger.report(error, { at: "uploadTemplateAsset.insert" });
    await removeObjects(written);
    return {
      ok: false,
      failure: {
        code: "database-error",
        message: "The design was not saved. Please try again.",
      },
    };
  }
}

/** Public URL for a stored object, or null when storage is unconfigured. */
export function templateAssetUrl(path: string | null): string | null {
  if (!path) return null;
  return objectPublicUrl(path);
}

export async function getTemplateAssets(): Promise<TemplateAssetRow[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await listAssets();
  } catch (error) {
    logger.report(error, { at: "getTemplateAssets" });
    return [];
  }
}

export async function getAssignableTemplates(): Promise<AssignableTemplate[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await listAssignableTemplates();
  } catch (error) {
    logger.report(error, { at: "getAssignableTemplates" });
    return [];
  }
}

export type MutationResult =
  | { ok: true }
  | { ok: false; failure: TemplateAssetFailure };

/**
 * Removes a design: the row, the catalogue references, and the objects.
 *
 * The database goes first. If storage removal fails afterwards the cost is an
 * orphaned object; if the row survived a successful storage delete, the
 * catalogue would render a broken image — which the brief lists as its own
 * failure case ("missing file") precisely because it is the visible one.
 */
export async function deleteTemplateAsset(id: string): Promise<MutationResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      failure: {
        code: "not-configured",
        message: "The database is not configured on this deployment.",
      },
    };
  }

  const asset = await findAsset(id).catch((error) => {
    logger.report(error, { at: "deleteTemplateAsset.find" });
    return null;
  });

  if (!asset) {
    return {
      ok: false,
      failure: {
        code: "not-found",
        message: "That design has already been deleted.",
      },
    };
  }

  try {
    await deleteAssetAndRestoreCovers(id);
  } catch (error) {
    logger.report(error, { at: "deleteTemplateAsset.delete" });
    return {
      ok: false,
      failure: {
        code: "database-error",
        message: "The design could not be deleted. Please try again.",
      },
    };
  }

  // Best effort, and deliberately after the fact. removeObjects logs its own
  // failures; a storage hiccup must not report a delete that already happened
  // as having failed, or an admin will press the button again and be told the
  // design was already deleted.
  await removeObjects(
    [asset.storagePath, asset.thumbnailPath].filter((p): p is string =>
      Boolean(p),
    ),
  );

  return { ok: true };
}

export async function assignArtwork(
  templateId: string,
  assetId: string,
): Promise<MutationResult> {
  const asset = await findAsset(assetId).catch(() => null);
  if (!asset) {
    return {
      ok: false,
      failure: { code: "not-found", message: "That design no longer exists." },
    };
  }

  const url = templateAssetUrl(asset.storagePath);
  if (!url) {
    return {
      ok: false,
      failure: {
        code: "not-configured",
        message: "File storage is not configured on this deployment.",
      },
    };
  }

  try {
    await repoAssign(templateId, assetId, url);
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "assignArtwork" });
    return {
      ok: false,
      failure: {
        code: "database-error",
        message: "The design could not be applied. Please try again.",
      },
    };
  }
}

export async function unassignArtwork(
  templateId: string,
): Promise<MutationResult> {
  try {
    await repoUnassign(templateId);
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "unassignArtwork" });
    return {
      ok: false,
      failure: {
        code: "database-error",
        message: "The design could not be removed. Please try again.",
      },
    };
  }
}
