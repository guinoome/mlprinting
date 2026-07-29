"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/form/form-status";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/lib/forms/action-state";
import { addTemplate } from "../actions";

const initialState: ActionState = {};

/**
 * Add a catalogue entry.
 *
 * Collapsed until asked for. The common visit to this page is uploading a
 * design or retiring one; a five-field form sitting open above that list would
 * push the actual work below the fold.
 *
 * Five fields, not the eleven a Template has — see validateNewTemplate for why.
 */
export function NewTemplateForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(addTemplate, initialState);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    // Cleared and closed on success, so a second add starts blank rather than
    // re-submitting the template that just landed.
    if (state.message) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.message]);

  return (
    <div className="space-y-3">
      {state.message ? <FormStatus state={{ message: state.message }} /> : null}

      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden="true" />
          Add a template
        </Button>
      ) : (
        <form
          ref={formRef}
          action={formAction}
          className="space-y-4 rounded-lg border p-4"
        >
          {state.error ? <FormStatus state={{ error: state.error }} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                name="name"
                maxLength={80}
                required
                aria-invalid={state.fieldErrors?.name ? true : undefined}
                placeholder="e.g. Sampaguita Dream"
              />
              {state.fieldErrors?.name ? (
                <p role="alert" className="text-xs text-destructive">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl-category">Occasion</Label>
              <select
                id="tpl-category"
                name="categoryId"
                defaultValue=""
                required
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="" disabled>
                  Choose one…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.categoryId ? (
                <p role="alert" className="text-xs text-destructive">
                  {state.fieldErrors.categoryId}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-short">One line for the card</Label>
            <Input
              id="tpl-short"
              name="shortDescription"
              maxLength={140}
              required
              aria-invalid={
                state.fieldErrors?.shortDescription ? true : undefined
              }
              placeholder="Soft white florals on ivory."
            />
            {state.fieldErrors?.shortDescription ? (
              <p role="alert" className="text-xs text-destructive">
                {state.fieldErrors.shortDescription}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-description">Full description</Label>
            <Textarea
              id="tpl-description"
              name="description"
              rows={3}
              required
              aria-invalid={state.fieldErrors?.description ? true : undefined}
              placeholder="Shown on the template's own page."
            />
            {state.fieldErrors?.description ? (
              <p role="alert" className="text-xs text-destructive">
                {state.fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-designer">Designer</Label>
            <Input
              id="tpl-designer"
              name="designer"
              maxLength={80}
              required
              defaultValue="ML Printing"
              aria-invalid={state.fieldErrors?.designer ? true : undefined}
            />
            {state.fieldErrors?.designer ? (
              <p role="alert" className="text-xs text-destructive">
                {state.fieldErrors.designer}
              </p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Created as a draft with generated cover art. Apply an uploaded
            design, then publish it — a new template should not reach customers
            wearing placeholder artwork.
          </p>

          <div className="flex gap-2">
            <SubmitButton pendingLabel="Creating…">Create draft</SubmitButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
