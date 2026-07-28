"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Check, Undo2 } from "lucide-react";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/lib/forms/action-state";
import type { AssignableTemplate } from "@/services/template-assets/types";
import { applyTemplateArtwork, restoreGeneratedCover } from "../actions";

const initialState: ActionState = {};

/**
 * Point a catalogue template at this design — the step that makes an upload
 * visible to customers.
 *
 * This is the bridge the brief's context asks for: "the current AI-generated
 * template design is not acceptable". Uploading alone changes nothing a visitor
 * sees; assigning overwrites the template's coverImageUrl, and every surface
 * that renders a cover picks it up.
 *
 * A native <select> rather than a combobox. There are ~51 templates grouped by
 * category, which is exactly what <optgroup> is for, and it is keyboard- and
 * screen-reader-correct without any work.
 */
export function AssignControl({
  assetId,
  templates,
  usedBy,
}: {
  assetId: string;
  templates: AssignableTemplate[];
  usedBy: { id: string; name: string }[];
}) {
  const [applyState, applyAction] = useFormState(
    applyTemplateArtwork,
    initialState,
  );
  const [restoreState, restoreAction] = useFormState(
    restoreGeneratedCover,
    initialState,
  );

  const grouped = React.useMemo(() => {
    const byCategory = new Map<string, AssignableTemplate[]>();
    for (const template of templates) {
      const list = byCategory.get(template.category.name) ?? [];
      list.push(template);
      byCategory.set(template.category.name, list);
    }
    return [...byCategory.entries()];
  }, [templates]);

  const error = applyState.error ?? restoreState.error;

  return (
    <div className="space-y-2">
      {usedBy.length > 0 ? (
        <ul className="space-y-1">
          {usedBy.map((template) => (
            <li
              key={template.id}
              className="flex items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-xs">
                <Check
                  className="size-3 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="truncate">{template.name}</span>
              </span>

              <form action={restoreAction}>
                <input
                  type="hidden"
                  name="templateId"
                  value={template.id}
                />
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  pendingLabel="Restoring…"
                  title={`Restore the generated cover for ${template.name}`}
                >
                  <Undo2 aria-hidden="true" />
                  Restore
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={applyAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="assetId" value={assetId} />

        <label className="sr-only" htmlFor={`apply-${assetId}`}>
          Apply this design to a template
        </label>
        <select
          id={`apply-${assetId}`}
          name="templateId"
          defaultValue=""
          required
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="" disabled>
            Apply to a template…
          </option>
          {grouped.map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.artworkId && template.artworkId !== assetId
                    ? " (has artwork)"
                    : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <SubmitButton size="sm" variant="outline" pendingLabel="Applying…">
          Apply
        </SubmitButton>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
