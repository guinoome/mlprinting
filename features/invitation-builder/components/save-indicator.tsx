"use client";

import { Check, CloudOff, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Autosave } from "./use-autosave";

/**
 * Autosave status and the manual Save — Ph3.md §8.
 *
 * Ph3.md asks for both automatic and manual save. The manual button is not
 * redundant with autosave: it is what makes autosave trustworthy. A customer who
 * cannot see their work being saved will not believe it is, and the button is
 * how they check.
 *
 * The status is announced politely — a save every twelve seconds shouted at a
 * screen-reader user would make the builder unusable.
 */
export function SaveIndicator({
  autosave,
  className,
}: {
  autosave: Autosave;
  className?: string;
}) {
  const { status, savedAt, error, saveNow } = autosave;

  const label = (() => {
    switch (status) {
      case "saving":
        return "Saving…";
      case "saved":
        return savedAt
          ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Saved";
      case "dirty":
        return "Unsaved changes";
      case "error":
        return error ?? "Could not save";
      default:
        return savedAt ? "Saved" : "";
    }
  })();

  const Icon = (() => {
    switch (status) {
      case "saving":
        return Loader2;
      case "saved":
        return Check;
      case "error":
        return CloudOff;
      case "dirty":
        return Pencil;
      default:
        return Check;
    }
  })();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-xs",
          status === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {label ? (
          <>
            <Icon
              className={cn("size-3.5", status === "saving" && "animate-spin")}
              aria-hidden="true"
            />
            {label}
          </>
        ) : null}
      </span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void saveNow()}
        disabled={status === "saving"}
      >
        Save
      </Button>
    </div>
  );
}
