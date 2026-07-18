"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import { routes } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AssetGrid } from "@/components/media/asset-grid";
import { UploadDropzone } from "@/components/media/upload-dropzone";
import {
  AssetDetailSheet,
  type MediaAssetDetail,
  type AssetUsageSummary,
} from "@/components/media/asset-detail-sheet";
import { updateAssetMetaAction, deleteAssetAction } from "./actions";

/**
 * Asset Browser — design doc's UI section. Sections are computed server-side
 * (app/(dashboard)/dashboard/media/page.tsx) so this component stays a plain
 * renderer regardless of which view produced them: "All" is one section, "By
 * Event" is one section per invitation (subgrouped by slot) plus "Unsorted",
 * "By Type" is one section per tag plus "Untagged" (design doc Decision 1).
 */

export interface AssetSubgroup {
  key: string;
  title: string;
  assets: MediaAssetDetail[];
}

export interface AssetSection {
  key: string;
  title: string;
  assets: MediaAssetDetail[];
  subgroups?: AssetSubgroup[];
}

const VIEWS = [
  { id: "all", label: "All" },
  { id: "byEvent", label: "By Event" },
  { id: "byType", label: "By Type" },
] as const;

export function MediaLibraryBrowser({
  view,
  sections,
  usagesByAssetId,
  quota,
  searchDefaults,
  pagination,
}: {
  view: "all" | "byEvent" | "byType";
  sections: AssetSection[];
  usagesByAssetId: Record<string, AssetUsageSummary[]>;
  quota: { totalBytes: number; totalCount: number };
  searchDefaults: { q: string; sort: string };
  pagination: { page: number; totalPages: number } | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const byId = React.useMemo(() => {
    const map = new Map<string, MediaAssetDetail>();
    for (const section of sections) {
      for (const asset of section.assets) map.set(asset.id, asset);
      for (const subgroup of section.subgroups ?? []) {
        for (const asset of subgroup.assets) map.set(asset.id, asset);
      }
    }
    return map;
  }, [sections]);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
        <HardDrive className="size-4" aria-hidden="true" />
        {quota.totalCount} {quota.totalCount === 1 ? "photo" : "photos"} ·{" "}
        {formatBytes(quota.totalBytes)}
      </div>

      <UploadDropzone onUploaded={() => router.refresh()} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="View" className="flex gap-1">
          {VIEWS.map((option) => (
            <Link
              key={option.id}
              href={`${routes.dashboard.media}?view=${option.id}`}
              role="tab"
              aria-selected={view === option.id}
              className={
                view === option.id
                  ? "rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>

        {view === "all" ? (
          <form
            action={routes.dashboard.media}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="view" value="all" />
            <Input
              type="search"
              name="q"
              defaultValue={searchDefaults.q}
              placeholder="Search filename, tags…"
              className="h-9 w-48"
            />
            <select
              name="sort"
              defaultValue={searchDefaults.sort}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="largest">Largest</option>
              <option value="name">Name</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"
            >
              Apply
            </button>
          </form>
        ) : null}
      </div>

      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {section.title ? (
            <h3 className="text-sm font-semibold">{section.title}</h3>
          ) : null}

          {section.subgroups ? (
            <div className="space-y-4">
              {section.subgroups.map((subgroup) => (
                <div key={subgroup.key}>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    {subgroup.title}
                  </h4>
                  <AssetGrid
                    assets={subgroup.assets}
                    onSelect={(asset) => setSelectedId(asset.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <AssetGrid
              assets={section.assets}
              onSelect={(asset) => setSelectedId(asset.id)}
            />
          )}
        </section>
      ))}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from(
            { length: pagination.totalPages },
            (_, index) => index + 1,
          ).map((page) => (
            <Link
              key={page}
              href={`${routes.dashboard.media}?view=all&page=${page}`}
              className={
                page === pagination.page
                  ? "rounded-md bg-muted px-3 py-1.5 font-medium"
                  : "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted/60"
              }
            >
              {page}
            </Link>
          ))}
        </div>
      ) : null}

      <AssetDetailSheet
        asset={selected}
        usages={selected ? (usagesByAssetId[selected.id] ?? []) : []}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onReplaced={() => router.refresh()}
        updateMetaAction={updateAssetMetaAction}
        deleteAction={deleteAssetAction}
      />
    </div>
  );
}
