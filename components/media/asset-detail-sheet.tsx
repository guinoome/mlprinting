"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { UploadDropzone } from "./upload-dropzone";
import type { MediaAssetSummary } from "./asset-card";

/**
 * Asset detail panel — design doc's UI section. Metadata edits and delete are
 * plain Server Actions bound via useFormState (the pattern every form in this
 * codebase already uses); Replace is the one exception, reusing
 * UploadDropzone in its single-file/assetId mode for real progress.
 */

export interface MediaAssetDetail extends MediaAssetSummary {
  previewUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

export interface AssetUsageSummary {
  invitationId: string;
  invitationTitle: string;
  slot: string;
}

export interface MetaFormState {
  error?: string;
}

export interface DeleteFormState {
  error?: string;
  usedBy?: string[];
}

export function AssetDetailSheet({
  asset,
  usages,
  open,
  onOpenChange,
  onReplaced,
  updateMetaAction,
  deleteAction,
}: {
  asset: MediaAssetDetail | null;
  usages: AssetUsageSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplaced?: () => void;
  updateMetaAction: (
    prev: MetaFormState,
    formData: FormData,
  ) => Promise<MetaFormState>;
  deleteAction: (
    prev: DeleteFormState,
    formData: FormData,
  ) => Promise<DeleteFormState>;
}) {
  const [metaState, metaAction] = useFormState(updateMetaAction, {});
  const [deleteState, runDelete] = useFormState(deleteAction, {});

  React.useEffect(() => {
    if (metaState.error) {
      notify.error({
        title: "Could not save changes",
        description: metaState.error,
      });
    }
  }, [metaState.error]);

  React.useEffect(() => {
    if (deleteState.error) {
      // Ph4.md §11 — name what is using it rather than just refusing, same
      // pattern as features/invitation-builder/components/steps/media-step.tsx.
      notify.error({
        title: "Cannot delete that image",
        description: deleteState.usedBy?.length
          ? `${deleteState.error} Used by: ${deleteState.usedBy.join(", ")}.`
          : deleteState.error,
      });
    }
  }, [deleteState.error, deleteState.usedBy]);

  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto sm:w-96"
      >
        <SheetTitle>{asset.originalFilename}</SheetTitle>
        <SheetDescription>
          {formatBytes(asset.bytes)}
          {asset.width && asset.height
            ? ` · ${asset.width}×${asset.height}`
            : ""}
          {` · Uploaded ${asset.uploadedAt}`}
        </SheetDescription>

        <div className="mt-4 space-y-6 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.previewUrl}
            alt={asset.altText ?? asset.originalFilename}
            className="w-full rounded-lg border border-border object-contain"
          />

          <form action={metaAction} className="space-y-3">
            <input type="hidden" name="assetId" value={asset.id} />
            <div>
              <label htmlFor="altText" className="text-xs font-medium">
                Alt text
              </label>
              <Input
                id="altText"
                name="altText"
                defaultValue={asset.altText ?? ""}
                placeholder="Describe this photo"
              />
            </div>
            <div>
              <label htmlFor="tags" className="text-xs font-medium">
                Tags
              </label>
              <Input
                id="tags"
                name="tags"
                defaultValue={asset.tags.join(", ")}
                placeholder="logo, corporate, background"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Save
            </Button>
          </form>

          <div>
            <h4 className="text-xs font-medium">Replace photo</h4>
            <p className="mb-2 text-xs text-muted-foreground">
              Every page using this photo updates automatically.
            </p>
            <UploadDropzone assetId={asset.id} onUploaded={onReplaced} />
          </div>

          <div>
            <h4 className="text-xs font-medium">Used in</h4>
            {usages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Not used by any invitation.
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {usages.map((usage) => (
                  <li key={`${usage.invitationId}-${usage.slot}`}>
                    {usage.invitationTitle} — {usage.slot.toLowerCase()}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={runDelete}>
            <input type="hidden" name="assetId" value={asset.id} />
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
