"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveMediaStep } from "../../actions";
import { removeMedia } from "../../media-actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AssetGrid } from "@/components/media/asset-grid";
import { UploadDropzone } from "@/components/media/upload-dropzone";
import type { MediaAssetSummary } from "@/components/media/asset-card";
import { notify } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Media — Ph3.md §7. Now browses the full Media Library (search included)
 * rather than the flat list Phase 3 shipped — Ph4.md's "Connect to the
 * Invitation Media Library."
 *
 * The library is the customer's whole set of uploads; the slots are
 * references into it. §7: "Do not duplicate uploaded assets" — one photo can
 * be the cover AND a couple photo, and choosing it twice stores two
 * references, not two files.
 */

export type Slot = "COVER" | "COUPLE" | "FAMILY" | "LOGO";

export interface Assignment {
  assetId: string;
  slot: Slot;
}

const SLOTS: {
  id: Slot;
  label: string;
  description: string;
  single: boolean;
}[] = [
  {
    id: "COVER",
    label: "Cover image",
    description: "The main photo, at the top.",
    single: true,
  },
  {
    id: "COUPLE",
    label: "Couple photos",
    description: "Shown in the gallery.",
    single: false,
  },
  {
    id: "FAMILY",
    label: "Family photos",
    description: "Also shown in the gallery.",
    single: false,
  },
  {
    id: "LOGO",
    label: "Logo",
    description: "For corporate events.",
    single: true,
  },
];

export function MediaStep({
  invitationId,
  assets: initialAssets,
  initialAssignments,
}: {
  invitationId: string;
  assets: MediaAssetSummary[];
  initialAssignments: Assignment[];
}) {
  const router = useRouter();
  const [assignments, setAssignments] =
    React.useState<Assignment[]>(initialAssignments);
  const [activeSlot, setActiveSlot] = React.useState<Slot>("COVER");
  const [query, setQuery] = React.useState("");

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("assignments", JSON.stringify(assignments));
    return saveMediaStep({}, formData);
  }, [invitationId, assignments]);

  const autosave = useAutosave({ save });

  function toggle(assetId: string, slot: Slot) {
    const definition = SLOTS.find((s) => s.id === slot)!;
    const already = assignments.some(
      (a) => a.assetId === assetId && a.slot === slot,
    );

    setAssignments((current) => {
      if (already)
        return current.filter(
          (a) => !(a.assetId === assetId && a.slot === slot),
        );

      const cleared = definition.single
        ? current.filter((a) => a.slot !== slot)
        : current;
      return [...cleared, { assetId, slot }];
    });

    autosave.markDirty();
  }

  async function handleRemove(asset: MediaAssetSummary) {
    const formData = new FormData();
    formData.set("assetId", asset.id);
    const result = await removeMedia({}, formData);

    if (result.error) {
      // Ph4.md §11 — name what is using it rather than just refusing.
      notify.error({
        title: "Cannot delete that image",
        description: result.usedBy?.length
          ? `${result.error} Used by: ${result.usedBy.join(", ")}.`
          : result.error,
      });
      return;
    }

    setAssignments((current) => current.filter((a) => a.assetId !== asset.id));
    router.refresh();
  }

  const filteredAssets = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return initialAssets;
    return initialAssets.filter(
      (asset) =>
        asset.originalFilename.toLowerCase().includes(term) ||
        asset.tags.some((tag) => tag.includes(term)),
    );
  }, [initialAssets, query]);

  const assignedIdsForActiveSlot = assignments
    .filter((a) => a.slot === activeSlot)
    .map((a) => a.assetId);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload a photo</CardTitle>
            <CardDescription>
              JPG, PNG, WebP, or HEIC, up to 10 MB. Upload once — you can use
              the same photo in more than one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDropzone onUploaded={() => router.refresh()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign photos</CardTitle>
            <CardDescription>
              Pick a slot, then tap the photos that belong in it — search your
              whole library if you have more than a few.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="tablist"
              aria-label="Photo slot"
              className="flex flex-wrap gap-1"
            >
              {SLOTS.map((slot) => {
                const count = assignments.filter(
                  (a) => a.slot === slot.id,
                ).length;

                return (
                  <button
                    key={slot.id}
                    role="tab"
                    type="button"
                    aria-selected={activeSlot === slot.id}
                    onClick={() => setActiveSlot(slot.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeSlot === slot.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {slot.label}
                    {count > 0 ? (
                      <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {SLOTS.find((s) => s.id === activeSlot)!.description}
            </p>

            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your photos by filename or tag"
              aria-label="Search your photos"
            />

            <AssetGrid
              assets={filteredAssets}
              selectedIds={assignedIdsForActiveSlot}
              onSelect={(asset) => toggle(asset.id, activeSlot)}
              onRemove={handleRemove}
              emptyTitle={
                initialAssets.length === 0 ? "No photos yet" : "No matches"
              }
              emptyDescription={
                initialAssets.length === 0
                  ? "Upload one above to get started."
                  : "Try a different search term."
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
