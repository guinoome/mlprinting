"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaAssetSummary {
  id: string;
  thumbnailUrl: string;
  altText: string | null;
  originalFilename: string;
  tags: string[];
}

export function AssetCard({
  asset,
  selected,
  onSelect,
  onRemove,
}: {
  asset: MediaAssetSummary;
  selected?: boolean;
  onSelect?: (asset: MediaAssetSummary) => void;
  /**
   * Optional quick-delete affordance — a small hover trash icon, sibling to
   * the select button rather than nested inside it (nesting two interactive
   * elements in one <button> is invalid). Task 17's builder picker uses this;
   * the library's own grid (Task 16) omits it, since delete there goes
   * through the full detail panel instead.
   */
  onRemove?: (asset: MediaAssetSummary) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect?.(asset)}
        aria-pressed={onSelect ? Boolean(selected) : undefined}
        className={cn(
          "relative block w-full overflow-hidden rounded-lg border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-foreground"
            : "border-transparent hover:border-border",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl}
          alt={asset.altText ?? asset.originalFilename}
          className="aspect-square w-full bg-muted object-cover"
          loading="lazy"
        />
        <p className="truncate px-1 py-1 text-xs text-muted-foreground">
          {asset.originalFilename}
        </p>
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(asset)}
          aria-label={`Delete ${asset.originalFilename}`}
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
