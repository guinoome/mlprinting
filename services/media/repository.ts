import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { MediaCriteria } from "./criteria";
import {
  buildMediaWhere,
  buildMediaOrderBy,
  buildMediaPagination,
} from "./query";
import type { AssetRow, AssetUsage, MediaKindValue } from "./types";

/**
 * Prisma CRUD for MediaAsset/InvitationMedia. Every read degrades to an empty
 * result when the database isn't configured, matching every other repository
 * in this codebase (features/template-marketplace/repository.ts, etc.) —
 * `next build` runs without secrets, so a module that throws on import-time
 * absence of DATABASE_URL would fail CI.
 */

const ASSET_SELECT = {
  id: true,
  profileId: true,
  bucket: true,
  storagePath: true,
  kind: true,
  mimeType: true,
  bytes: true,
  originalFilename: true,
  altText: true,
  tags: true,
  version: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export interface InsertAssetInput {
  id: string;
  profileId: string;
  bucket: string;
  storagePath: string;
  kind: MediaKindValue;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  altText: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
}

export async function insertAsset(data: InsertAssetInput): Promise<AssetRow> {
  return prisma.mediaAsset.create({ data, select: ASSET_SELECT });
}

export async function findAssetById(
  profileId: string,
  assetId: string,
): Promise<AssetRow | null> {
  if (!isDatabaseConfigured()) return null;
  return prisma.mediaAsset.findFirst({
    where: { id: assetId, profileId },
    select: ASSET_SELECT,
  });
}

export async function searchAssets(
  profileId: string,
  criteria: MediaCriteria,
): Promise<{ assets: AssetRow[]; totalCount: number }> {
  if (!isDatabaseConfigured()) return { assets: [], totalCount: 0 };

  try {
    const where = buildMediaWhere(criteria, { profileId });
    const orderBy = buildMediaOrderBy(criteria.sort);
    const { skip, take } = buildMediaPagination(criteria);

    const [assets, totalCount] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy,
        skip,
        take,
        select: ASSET_SELECT,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { assets, totalCount };
  } catch (error) {
    logger.report(error, { at: "searchAssets", profileId });
    return { assets: [], totalCount: 0 };
  }
}

/** Every asset for a profile, uncapped by pagination — folder computation (services/media/folders.ts) needs the whole pool, not one page of it. */
export async function listAllAssets(profileId: string): Promise<AssetRow[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.mediaAsset.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      select: ASSET_SELECT,
    });
  } catch (error) {
    logger.report(error, { at: "listAllAssets", profileId });
    return [];
  }
}

export async function findUsagesForProfile(
  profileId: string,
): Promise<AssetUsage[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.invitationMedia.findMany({
      where: { asset: { profileId } },
      select: {
        assetId: true,
        slot: true,
        invitation: { select: { id: true, title: true } },
      },
    });

    return rows.map((row) => ({
      assetId: row.assetId,
      invitationId: row.invitation.id,
      invitationTitle: row.invitation.title,
      slot: row.slot,
    }));
  } catch (error) {
    logger.report(error, { at: "findUsagesForProfile", profileId });
    return [];
  }
}

export interface ReplaceAssetInput {
  bucket: string;
  storagePath: string;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  width: number | null;
  height: number | null;
}

/** Bumps version and overwrites file metadata. The caller (index.ts replaceAsset) only removes the previous version's storage objects after this resolves. */
export async function bumpVersionAndUpdate(
  assetId: string,
  data: ReplaceAssetInput,
): Promise<AssetRow> {
  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: { ...data, version: { increment: 1 } },
    select: ASSET_SELECT,
  });
}

export async function updateAssetMeta(
  profileId: string,
  assetId: string,
  data: { altText?: string | null; tags?: string[] },
): Promise<AssetRow | null> {
  if (!isDatabaseConfigured()) return null;

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: assetId, profileId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.mediaAsset.update({
    where: { id: assetId },
    data,
    select: ASSET_SELECT,
  });
}

export async function deleteAssetRow(assetId: string): Promise<void> {
  await prisma.mediaAsset.delete({ where: { id: assetId } });
}

/** Invitation titles referencing this asset — Ph4.md §11's delete-protection message. */
export async function findBlockingUsages(assetId: string): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];

  const usages = await prisma.invitationMedia.findMany({
    where: { assetId },
    select: { invitation: { select: { title: true } } },
    take: 10,
  });
  return usages.map((usage) => usage.invitation.title);
}

export interface QuotaByEvent {
  invitationId: string;
  title: string;
  bytes: number;
  count: number;
}

export interface Quota {
  totalBytes: number;
  totalCount: number;
  byEvent: QuotaByEvent[];
}

/** One aggregate query overall, one grouped by event — Ph4.md §12. Display only: no enforcement, matching "future subscription plans can use this without architectural changes." */
export async function getQuota(profileId: string): Promise<Quota> {
  if (!isDatabaseConfigured()) {
    return { totalBytes: 0, totalCount: 0, byEvent: [] };
  }

  try {
    const [overall, usages] = await Promise.all([
      prisma.mediaAsset.aggregate({
        where: { profileId },
        _sum: { bytes: true },
        _count: true,
      }),
      prisma.invitationMedia.findMany({
        where: { asset: { profileId } },
        select: {
          invitation: { select: { id: true, title: true } },
          asset: { select: { id: true, bytes: true } },
        },
      }),
    ]);

    const byEvent = new Map<string, QuotaByEvent>();
    const countedPerEvent = new Map<string, Set<string>>();

    for (const usage of usages) {
      const key = usage.invitation.id;
      let bucket = byEvent.get(key);
      if (!bucket) {
        bucket = {
          invitationId: key,
          title: usage.invitation.title,
          bytes: 0,
          count: 0,
        };
        byEvent.set(key, bucket);
        countedPerEvent.set(key, new Set());
      }

      // One asset used twice in the same event (e.g. cover and gallery) must
      // count once, not twice — this is quota display, not a usage tally.
      const seen = countedPerEvent.get(key)!;
      if (!seen.has(usage.asset.id)) {
        seen.add(usage.asset.id);
        bucket.bytes += usage.asset.bytes;
        bucket.count += 1;
      }
    }

    return {
      totalBytes: overall._sum.bytes ?? 0,
      totalCount: overall._count,
      byEvent: [...byEvent.values()],
    };
  } catch (error) {
    logger.report(error, { at: "getQuota", profileId });
    return { totalBytes: 0, totalCount: 0, byEvent: [] };
  }
}
