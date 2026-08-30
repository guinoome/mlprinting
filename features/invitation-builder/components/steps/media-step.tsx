"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveMediaStep } from "../../actions";
import { remasterMedia, removeMedia } from "../../media-actions";
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
  derivativeId?: string | null;
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

  function chooseTreatment(
    assetId: string,
    slot: Slot,
    derivativeId: string | null,
  ) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.assetId === assetId && assignment.slot === slot
          ? { ...assignment, derivativeId }
          : assignment,
      ),
    );
    autosave.markDirty();
  }

  async function handleRemaster(asset: MediaAssetSummary) {
    const formData = new FormData();
    formData.set("assetId", asset.id);
    const result = await remasterMedia({}, formData);
    if (result.error) {
      notify.error({
        title: "Could not create remaster",
        description: result.error,
      });
      return;
    }
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
            {assignments.some(
              (assignment) => assignment.slot === activeSlot,
            ) ? (
              <div className="space-y-3 rounded-lg border bg-muted/25 p-4">
                <div>
                  <h3 className="text-sm font-medium">Photo treatment</h3>
                  <p className="text-xs text-muted-foreground">
                    Original is always preserved and used by default. A remaster
                    is optional, and you can switch back at any time.
                  </p>
                </div>
                {assignments
                  .filter((assignment) => assignment.slot === activeSlot)
                  .map((assignment) => {
                    const asset = initialAssets.find(
                      (candidate) => candidate.id === assignment.assetId,
                    );
                    if (!asset) return null;
                    const usingRemaster =
                      assignment.derivativeId === asset.remaster?.id;
                    return (
                      <div
                        key={`${assignment.slot}:${assignment.assetId}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-3"
                      >
                        <span className="max-w-48 truncate text-sm">
                          {asset.originalFilename}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            aria-pressed={!usingRemaster}
                            onClick={() =>
                              chooseTreatment(asset.id, activeSlot, null)
                            }
                            className={cn(
                              "rounded-md border px-3 py-1.5 text-xs font-medium",
                              !usingRemaster && "bg-foreground text-background",
                            )}
                          >
                            Use Original
                          </button>
                          {asset.remaster ? (
                            <button
                              type="button"
                              aria-pressed={usingRemaster}
                              onClick={() =>
                                chooseTreatment(
                                  asset.id,
                                  activeSlot,
                                  asset.remaster!.id,
                                )
                              }
                              className={cn(
                                "rounded-md border px-3 py-1.5 text-xs font-medium",
                                usingRemaster &&
                                  "bg-foreground text-background",
                              )}
                            >
                              Use Remaster
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemaster(asset)}
                              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                              Create optional remaster
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
