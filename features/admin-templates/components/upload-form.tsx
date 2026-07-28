"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStatus } from "@/components/form/form-status";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/lib/forms/action-state";
import { formatBytes } from "@/lib/utils";
import { uploadTemplateArtwork } from "../actions";
import {
  MAX_TEMPLATE_ASSET_BYTES,
  TEMPLATE_ASSET_ACCEPT,
  TEMPLATE_ASSET_EXTENSIONS,
} from "@/services/template-assets/constraints";

const initialState: ActionState = {};

/**
 * Upload a designed cover — Instructions 4, "Upload".
 *
 * Deliberately not built on components/ui/file-drop.tsx. That component is
 * bound to services/upload's `image` kind, which also permits HEIC at a
 * different size ceiling; wiring it here would let an admin pick a file the
 * client called valid and the server then refused. The rules a person sees
 * have to be the rules that are enforced, so this reads its constraints from
 * the same module the Server Action validates against.
 */
export function TemplateUploadForm() {
  const [state, formAction] = useFormState(uploadTemplateArtwork, initialState);
  const [file, setFile] = React.useState<File | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Clear the picker after a success so the next upload starts empty rather
  // than re-submitting the design that just landed.
  React.useEffect(() => {
    if (state.message) {
      formRef.current?.reset();
      setFile(null);
      setLocalError(null);
    }
  }, [state.message]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setLocalError(null);

    if (picked && picked.size > MAX_TEMPLATE_ASSET_BYTES) {
      // Immediate, before pushing megabytes up a phone connection. The server
      // checks again — this is the courtesy, not the control.
      setLocalError(
        `That design is ${formatBytes(picked.size)}. The limit is ${formatBytes(MAX_TEMPLATE_ASSET_BYTES)}.`,
      );
    }
    setFile(picked);
  }

  const fileError = localError ?? state.fieldErrors?.file;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormStatus state={state} />

      <div className="space-y-2">
        <Label htmlFor="file">Design file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept={TEMPLATE_ASSET_ACCEPT}
          onChange={onPick}
          aria-invalid={fileError ? true : undefined}
          aria-describedby="file-hint"
          required
        />
        <p id="file-hint" className="text-xs text-muted-foreground">
          {TEMPLATE_ASSET_EXTENSIONS.join(", ")} up to{" "}
          {formatBytes(MAX_TEMPLATE_ASSET_BYTES)}. Portrait artwork looks best —
          the catalogue crops covers to a tall card.
        </p>
        {fileError ? (
          <p role="alert" className="text-xs text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          maxLength={120}
          placeholder={file ? "Taken from the filename" : "e.g. Rustic Garden"}
        />
      </div>

      <SubmitButton pendingLabel="Uploading…" disabled={Boolean(localError)}>
        <ImagePlus aria-hidden="true" />
        Upload design
      </SubmitButton>
    </form>
  );
}
