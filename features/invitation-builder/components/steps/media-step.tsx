"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Check, Trash2, Images } from "lucide-react";
import { saveMediaStep } from "../../actions";
import {
  uploadMedia,
  removeMedia,
  type MediaUploadState,
} from "../../media-actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDrop } from "@/components/ui/file-drop";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Media — Ph3.md §7.
 *
 * The library is the customer's whole set of uploads; the slots are references
 * into it. That shape is the spec's: §7 says "Do not duplicate uploaded assets"
 * and "Capture Once, Reuse Everywhere", so one photo can be the cover AND a
 * couple photo, and choosing it twice stores two references, not two files.
 *
 * Ph4 replaces the picker below with the real Media Library — folders, search,
 * processing. The assignment model does not change, which is why it is worth
 * getting right now.
 */

export interface AssetSummary {
  id: string;
  url: string | null;
  altText: string | null;
  originalFilename: string;
}

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

const uploadInitial: MediaUploadState = {};

export function MediaStep({
  invitationId,
  assets: initialAssets,
  initialAssignments,
}: {
  invitationId: string;
  assets: AssetSummary[];
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] =
    React.useState<Assignment[]>(initialAssignments);
  const [activeSlot, setActiveSlot] = React.useState<Slot>("COVER");
  const [uploadState, uploadAction] = useFormState(uploadMedia, uploadInitial);
  const [removeState, removeAction] = useFormState(removeMedia, uploadInitial);

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("assignments", JSON.stringify(assignments));
    return saveMediaStep({}, formData);
  }, [invitationId, assignments]);

  const autosave = useAutosave({ save });

  React.useEffect(() => {
    if (uploadState.error) {
      notify.error({ title: "Upload failed", description: uploadState.error });
    }
  }, [uploadState.error]);

  React.useEffect(() => {
    if (removeState.error) {
      // Ph4.md §11 — name what is using it rather than just refusing.
      notify.error({
        title: "Cannot delete that image",
        description: removeState.usedBy?.length
          ? `${removeState.error} Used by: ${removeState.usedBy.join(", ")}.`
          : removeState.error,
      });
    }
  }, [removeState.error, removeState.usedBy]);

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

      // A single-slot choice replaces rather than stacks: there is one cover.
      const cleared = definition.single
        ? current.filter((a) => a.slot !== slot)
        : current;
      return [...cleared, { assetId, slot }];
    });

    autosave.markDirty();
  }

  const assignedTo = (assetId: string) =>
    assignments.filter((a) => a.assetId === assetId).map((a) => a.slot);

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
            <form
              action={uploadAction}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <FileDrop name="file" kind="image" className="flex-1" />
              <Button type="submit" variant="outline">
                Upload
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign photos</CardTitle>
            <CardDescription>
              Pick a slot, then tap the photos that belong in it.
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

            {initialAssets.length === 0 ? (
              <EmptyState
                icon={<Images />}
                title="No photos yet"
                description="Upload one above to get started."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {initialAssets.map((asset) => {
                  const slots = assignedTo(asset.id);
                  const inActiveSlot = slots.includes(activeSlot);

                  return (
                    <div key={asset.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => toggle(asset.id, activeSlot)}
                        aria-pressed={inActiveSlot}
                        className={cn(
                          "relative block w-full overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          inActiveSlot
                            ? "border-foreground"
                            : "border-transparent hover:border-border",
                        )}
                      >
                        {asset.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.url}
                            alt={asset.altText ?? asset.originalFilename}
                            className="aspect-square w-full bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            Preview unavailable
                          </div>
                        )}

                        {inActiveSlot ? (
                          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                            <Check className="size-3" aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>

                      {/* Reference count, not decoration: it is the visible proof
                          of Capture Once, Reuse Everywhere. */}
                      {slots.length > 0 ? (
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          Used in {slots.length}{" "}
                          {slots.length === 1 ? "slot" : "slots"}
                        </p>
                      ) : null}

                      <form
                        action={removeAction}
                        className="absolute left-1.5 top-1.5"
                      >
                        <input type="hidden" name="assetId" value={asset.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-7 bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                          aria-label={`Delete ${asset.originalFilename}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
