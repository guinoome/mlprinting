"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateUpload,
  acceptAttribute,
  UPLOAD_CONSTRAINTS,
} from "@/services/upload";
import type { UploadKind } from "@/services/upload";
import { formatBytes } from "@/lib/utils";

/**
 * Reusable file picker with drag-and-drop — Ph1.md §8.
 *
 * Validates on selection so the user hears "too large" immediately rather than
 * after a 20 MB upload. The server validates again; this is the courtesy, not
 * the control (see services/upload/validation.ts).
 *
 * The <input type="file"> stays in the DOM and does the work — the drop zone is
 * a label for it. A div with click handlers looks identical and is unreachable
 * by keyboard.
 */
export function FileDrop({
  name,
  kind,
  onSelect,
  disabled,
  className,
}: {
  name: string;
  kind: UploadKind;
  /** Called with a valid file, or null when selection is cleared or rejected. */
  onSelect?: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<File | null>(null);

  const { maxBytes, extensions } = UPLOAD_CONSTRAINTS[kind];

  const accept = React.useCallback(
    (file: File | undefined) => {
      setError(null);

      if (!file) {
        setSelected(null);
        onSelect?.(null);
        return;
      }

      const failure = validateUpload(
        { name: file.name, size: file.size, type: file.type },
        kind,
      );

      if (failure) {
        setError(failure.message);
        setSelected(null);
        onSelect?.(null);
        // Clear the input too, or the rejected file stays staged and would be
        // submitted with the form.
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setSelected(file);
      onSelect?.(file);
    },
    [kind, onSelect],
  );

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    // Mirror the dropped file into the input so a plain form submit carries it.
    if (file && inputRef.current) {
      inputRef.current.files = event.dataTransfer.files;
    }
    accept(file);
  }

  return (
    <div className={className}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          dragging
            ? "border-primary bg-muted"
            : "border-border hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-destructive",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={acceptAttribute(kind)}
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0])}
          className="sr-only"
          aria-describedby={`${name}-constraints`}
          aria-invalid={error ? true : undefined}
        />

        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">
          {selected ? selected.name : "Choose a file or drag it here"}
        </span>
        <span
          id={`${name}-constraints`}
          className="text-xs text-muted-foreground"
        >
          {selected
            ? formatBytes(selected.size)
            : `${extensions.join(", ")} — up to ${formatBytes(maxBytes)}`}
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
