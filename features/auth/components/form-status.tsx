"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "../actions";

/**
 * Form-level outcome banner — the errors and messages that belong to the whole
 * submission rather than one field.
 *
 * role="alert" so the result is announced. Auth failures are not toasted: a
 * toast can auto-dismiss before it is read, and it sits away from the form the
 * user is looking at.
 */
export function FormStatus({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
      >
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <span>{state.error}</span>
      </div>
    );
  }

  if (state.message) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-sm text-foreground"
      >
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-success"
          aria-hidden="true"
        />
        <span>{state.message}</span>
      </div>
    );
  }

  return null;
}
