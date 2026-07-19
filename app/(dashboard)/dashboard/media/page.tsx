import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  listAssets,
  searchAssets,
  getFolders,
  getQuota,
  thumbnailUrl,
  previewUrl,
  type AssetRow,
} from "@/services/media";
import {
  MediaLibraryBrowser,
  type AssetSection,
} from "@/features/media-library/browser";
import type { MediaAssetDetail, AssetUsageSummary } from "@/components/media/asset-detail-sheet";

export const metadata: Metadata = {
  title: "Media Library",
};

export const dynamic = "force-dynamic";

function toDetail(asset: AssetRow): MediaAssetDetail {
  return {
    id: asset.id,
    thumbnailUrl: thumbnailUrl(asset),
    previewUrl: previewUrl(asset),
    altText: asset.altText,
    originalFilename: asset.originalFilename,
    tags: asset.tags,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    uploadedAt: asset.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Asset Browser — replaces the Phase 1 placeholder. The flag check mirrors
 * dashboard/events/page.tsx: with the library off, this must go back to being
 * an honest placeholder.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!features.mediaLibrary) {
    return (
      <PlaceholderModule
        title="Media Library"
        description="Photos and files you have uploaded, reusable across events."
        icon={Images}
        phase={4}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Media Library" },
        ]}
      />
    );
  }

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const view =
    searchParams.view === "byEvent" || searchParams.view === "byType"
      ? searchParams.view
      : "all";

  const [allAssets, quota] = await Promise.all([
    listAssets(profile.id),
    getQuota(profile.id),
  ]);
  const folders = await getFolders(profile.id, allAssets);

  const assetById = new Map(allAssets.map((asset) => [asset.id, asset]));
  const resolve = (ids: string[]) =>
    ids
      .map((id) => assetById.get(id))
      .filter((asset): asset is AssetRow => Boolean(asset))
      .map(toDetail);

  // Invert the by-event grouping into assetId -> usages, for the detail
  // panel's "Used in" list, regardless of which view is currently active.
  const usagesByAssetId: Record<string, AssetUsageSummary[]> = {};
  for (const event of folders.byEvent.events) {
    for (const [slot, assetIds] of Object.entries(event.bySlot)) {
      for (const assetId of assetIds) {
        (usagesByAssetId[assetId] ??= []).push({
          invitationId: event.invitationId,
          invitationTitle: event.title,
          slot,
        });
      }
    }
  }

  let sections: AssetSection[];
  let pagination: { page: number; totalPages: number } | null = null;
  let searchDefaults = { q: "", sort: "newest" };

  if (view === "all") {
    const result = await searchAssets(profile.id, searchParams);
    searchDefaults = { q: result.criteria.q ?? "", sort: result.criteria.sort };
    sections = [{ key: "all", title: "", assets: result.assets.map(toDetail) }];
    pagination = {
      page: result.criteria.page,
      totalPages: Math.max(
        1,
        Math.ceil(result.totalCount / result.criteria.perPage),
      ),
    };
  } else if (view === "byEvent") {
    sections = [
      ...folders.byEvent.events.map((event) => ({
        key: event.invitationId,
        title: event.title,
        assets: [],
        subgroups: Object.entries(event.bySlot).map(([slot, assetIds]) => ({
          key: slot,
          title: slot.charAt(0) + slot.slice(1).toLowerCase(),
          assets: resolve(assetIds),
        })),
      })),
      {
        key: "unsorted",
        title: "Unsorted",
        assets: resolve(folders.byEvent.unsorted),
      },
    ];
  } else {
    sections = [
      ...Object.entries(folders.byType.tags).map(([tag, assetIds]) => ({
        key: tag,
        title: tag,
        assets: resolve(assetIds),
      })),
      {
        key: "untagged",
        title: "Untagged",
        assets: resolve(folders.byType.untagged),
      },
    ];
  }

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Photos you have uploaded, reusable across every event."
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Media Library" },
        ]}
      />

      <MediaLibraryBrowser
        view={view}
        sections={sections}
        usagesByAssetId={usagesByAssetId}
        quota={{ totalBytes: quota.totalBytes, totalCount: quota.totalCount }}
        searchDefaults={searchDefaults}
        pagination={pagination}
      />
    </>
  );
}
