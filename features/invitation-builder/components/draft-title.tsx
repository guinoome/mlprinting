"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Pencil } from "lucide-react";
import { renameDraft, type SaveState } from "../actions";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/hooks/use-toast";

const initialState: SaveState = {};

/**
 * Inline draft rename — Ph3.md §11 (Rename Draft).
 *
 * Click-to-edit rather than a settings page: renaming a draft is a five-second
 * job and should not require a round trip to a form. Escape cancels, Enter and
 * blur commit — the conventions a text field already implies.
 */
export function DraftTitle({
  invitationId,
  title,
}: {
  invitationId: string;
  title: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(title);
  const [state, formAction] = useFormState(renameDraft, initialState);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Server-rendered title wins when it changes underneath us.
  React.useEffect(() => setValue(title), [title]);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  React.useEffect(() => {
    if (state.error)
      notify.error({ title: "Could not rename", description: state.error });
  }, [state.error]);

  const fieldError = state.fieldErrors?.title;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate text-lg font-semibold tracking-tight">
          {title}
        </span>
        <Pencil
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
        <span className="sr-only">Rename this draft</span>
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="min-w-0"
      onSubmit={() => setEditing(false)}
    >
      <input type="hidden" name="invitationId" value={invitationId} />
      <Input
        ref={inputRef}
        name="title"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue(title); // Discard.
            setEditing(false);
          }
        }}
        onBlur={() => {
          if (value.trim() && value !== title) formRef.current?.requestSubmit();
          else setEditing(false);
        }}
        aria-label="Draft name"
        aria-invalid={fieldError ? true : undefined}
        className="h-9 text-lg font-semibold"
      />
      {fieldError ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {fieldError}
        </p>
      ) : null}
    </form>
  );
}
