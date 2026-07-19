"use client";

import { Images } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetCard, type MediaAssetSummary } from "./asset-card";

export function AssetGrid({
  assets,
  selectedIds,
  onSelect,
  onRemove,
  emptyTitle = "No photos yet",
  emptyDescription = "Upload one to get started.",
}: {
  assets: MediaAssetSummary[];
  selectedIds?: string[];
  onSelect?: (asset: MediaAssetSummary) => void;
  onRemove?: (asset: MediaAssetSummary) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Images />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          selected={selectedIds?.includes(asset.id)}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
