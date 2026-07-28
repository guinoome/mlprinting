import "server-only";

import { prisma } from "@/lib/db";
import type { TemplateAssetRow, AssignableTemplate } from "./types";

/**
 * Database access for uploaded template artwork — Instructions 4.
 *
 * Separated from index.ts on the same grounds as services/media: the service
 * orchestrates storage and the database together, and mixing Prisma calls into
 * that orchestration makes the failure ordering impossible to follow.
 */

const ASSET_SELECT = {
  id: true,
  name: true,
  bucket: true,
  storagePath: true,
  thumbnailPath: true,
  originalFilename: true,
  mimeType: true,
  bytes: true,
  width: true,
  height: true,
  createdAt: true,
  uploadedBy: { select: { displayName: true, email: true } },
  templates: { select: { id: true, name: true, slug: true } },
} as const;

/** Newest first — the only ordering the brief asks for. */
export async function listAssets(): Promise<TemplateAssetRow[]> {
  return prisma.templateAsset.findMany({
    select: ASSET_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function findAsset(id: string): Promise<TemplateAssetRow | null> {
  return prisma.templateAsset.findUnique({
    where: { id },
    select: ASSET_SELECT,
  });
}

export async function insertAsset(data: {
  id: string;
  name: string;
  bucket: string;
  storagePath: string;
  thumbnailPath: string | null;
  originalFilename: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedById: string | null;
}): Promise<TemplateAssetRow> {
  return prisma.templateAsset.create({ data, select: ASSET_SELECT });
}

/**
 * Deletes the row and returns the templates that were wearing it.
 *
 * The schema's `onDelete: SetNull` clears `artworkId`, but it cannot restore
 * `coverImageUrl` — that is this function's job, and it has to happen in the
 * same transaction. A template left pointing at a deleted object renders a
 * broken image on the public catalogue, which is a worse outcome than the
 * delete failing outright.
 */
export async function deleteAssetAndRestoreCovers(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const wearing = await tx.template.findMany({
      where: { artworkId: id },
      select: { id: true, generatedCoverUrl: true },
    });

    for (const template of wearing) {
      await tx.template.update({
        where: { id: template.id },
        data: {
          // Null would violate the column's NOT NULL, and there is no sensible
          // third option: a template that never had generated art cannot exist,
          // because every seeded row is created with one.
          coverImageUrl: template.generatedCoverUrl ?? "",
          artworkId: null,
          generatedCoverUrl: null,
        },
      });
    }

    await tx.templateAsset.delete({ where: { id } });
  });
}

/** Catalogue entries an admin can point artwork at, with what they wear now. */
export async function listAssignableTemplates(): Promise<AssignableTemplate[]> {
  return prisma.template.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      coverImageUrl: true,
      artworkId: true,
      category: { select: { name: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
}

/**
 * Points a catalogue template at uploaded artwork.
 *
 * Remembers the generated cover on the first assignment only. Re-assigning an
 * already-dressed template must not overwrite the memory with the *previous
 * upload's* URL, or un-assigning later would restore artwork instead of the
 * original generated design — and the original would be unrecoverable.
 */
export async function assignArtwork(
  templateId: string,
  assetId: string,
  publicUrl: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.template.findUnique({
      where: { id: templateId },
      select: { coverImageUrl: true, generatedCoverUrl: true },
    });
    if (!current) return;

    await tx.template.update({
      where: { id: templateId },
      data: {
        coverImageUrl: publicUrl,
        artworkId: assetId,
        generatedCoverUrl: current.generatedCoverUrl ?? current.coverImageUrl,
      },
    });
  });
}

/** Restores the generated cover this template had before any upload. */
export async function unassignArtwork(templateId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.template.findUnique({
      where: { id: templateId },
      select: { generatedCoverUrl: true },
    });
    if (!current?.generatedCoverUrl) return;

    await tx.template.update({
      where: { id: templateId },
      data: {
        coverImageUrl: current.generatedCoverUrl,
        artworkId: null,
        generatedCoverUrl: null,
      },
    });
  });
}
