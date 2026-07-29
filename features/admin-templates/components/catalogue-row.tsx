"use client";

import * as React from "react";
import Image from "next/image";
import { useFormState } from "react-dom";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/lib/forms/action-state";
import type { CatalogueRow as Row } from "../catalogue-repository";
import { removeTemplate, setTemplatePublished } from "../actions";

const initialState: ActionState = {};

/**
 * One catalogue template, with the two ways to retire it.
 *
 * Unpublish is a plain button because it is reversible and harmless. Delete
 * asks first, and the confirmation names the consequence rather than asking
 * "are you sure?" — a question the admin cannot answer without the information
 * this row already has.
 */
export function CatalogueRow({ row }: { row: Row }) {
  const [publishState, publishAction] = useFormState(
    setTemplatePublished,
    initialState,
  );
  const [deleteState, deleteAction] = useFormState(
    removeTemplate,
    initialState,
  );
  const [confirming, setConfirming] = React.useState(false);

  const published = row.publishedAt !== null;
  const deletable = row.removal.available.includes("delete");
  const error = publishState.error ?? deleteState.error;

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-muted">
        <Image
          src={row.coverImageUrl}
          alt=""
          fill
          sizes="4rem"
          className="object-cover"
          // Generated covers are first-party SVG from our own route; uploaded
          // ones are rasters. Neither benefits from optimisation at this size.
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {row.name}
          {published ? null : (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              Draft
            </span>
          )}
          {row.isFeatured ? (
            <span className="rounded border border-success/40 bg-success/5 px-1.5 py-0.5 text-[10px] font-normal">
              Featured
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.categoryName} · {row.slug}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.usage.invitations === 0
            ? "No invitations use this"
            : `${row.usage.invitations} invitation${row.usage.invitations === 1 ? "" : "s"}`}
          {row.usage.favorites > 0 ? ` · ${row.usage.favorites} saved` : ""}
        </p>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <form action={publishAction}>
          <input type="hidden" name="templateId" value={row.id} />
          <input type="hidden" name="publish" value={String(!published)} />
          <SubmitButton
            variant="outline"
            size="sm"
            pendingLabel={published ? "Hiding…" : "Publishing…"}
          >
            {published ? (
              <>
                <EyeOff aria-hidden="true" />
                Unpublish
              </>
            ) : (
              <>
                <Eye aria-hidden="true" />
                Publish
              </>
            )}
          </SubmitButton>
        </form>

        {confirming ? (
          <form action={deleteAction} className="space-y-1 text-right">
            <input type="hidden" name="templateId" value={row.id} />
            <p className="max-w-[15rem] text-xs text-muted-foreground">
              Delete {row.name} permanently? Nothing uses it, so nothing else
              changes.
            </p>
            <div className="flex justify-end gap-2">
              <SubmitButton
                variant="destructive"
                size="sm"
                pendingLabel="Deleting…"
              >
                Yes, delete
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : deletable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        ) : (
          /* Not a disabled button. A disabled control invites the question
             "why", and the answer is the sentence itself. */
          <p className="max-w-[15rem] text-right text-xs text-muted-foreground">
            {row.removal.blockedReason}
          </p>
        )}
      </div>
    </li>
  );
}
