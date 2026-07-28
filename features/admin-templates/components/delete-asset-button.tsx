"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/lib/forms/action-state";
import { removeTemplateArtwork } from "../actions";

const initialState: ActionState = {};

/**
 * Delete, behind a confirmation — Instructions 4, "Delete".
 *
 * The confirmation is inline rather than a modal because the consequence is
 * local and the surrounding card is the context: which design, and which
 * templates are wearing it. A dialog would cover exactly the information
 * somebody needs in order to answer.
 *
 * The warning names the templates affected. "Are you sure?" asks a question the
 * admin cannot answer; "three templates go back to their generated covers"
 * tells them what they are agreeing to.
 */
export function DeleteAssetButton({
  assetId,
  assetName,
  usedBy,
}: {
  assetId: string;
  assetName: string;
  usedBy: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(removeTemplateArtwork, initialState);
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
        {state.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assetId" value={assetId} />

      <p className="text-xs text-muted-foreground">
        Delete <span className="font-medium text-foreground">{assetName}</span>?
        The file is removed permanently.
        {usedBy.length > 0 ? (
          <>
            {" "}
            {usedBy.length === 1 ? "One template" : `${usedBy.length} templates`}{" "}
            using it ({usedBy.map((t) => t.name).join(", ")}) will go back to
            the generated cover.
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="destructive" size="sm" pendingLabel="Deleting…">
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

      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
