"use client";

import * as React from "react";
import { MoreVertical, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDraft } from "../actions";
import { notify } from "@/lib/hooks/use-toast";
import { routes } from "@/lib/config";
import Link from "next/link";

/**
 * Per-draft actions — Ph3.md §11 (Rename, Delete).
 *
 * Delete asks first. It cascades hosts, venues, content, and media links, and
 * there is no undo — a customer who loses a half-built wedding invitation to a
 * misclick has lost real work. The confirm is deliberately native: it cannot be
 * missed, dismissed by a stray click, or rendered behind something.
 *
 * Rename is a link to the builder rather than a dialog here — the title is
 * click-to-edit there, and one rename affordance is enough.
 */
export function DraftMenu({
  invitationId,
  title,
}: {
  invitationId: string;
  title: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function onDelete() {
    const confirmed = window.confirm(
      `Delete "${title}"? This removes the invitation and everything in it. It cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("invitationId", invitationId);
      const result = await deleteDraft(formData);

      // deleteDraft redirects on success, so reaching here means it failed.
      if (result?.error) {
        notify.error({ title: "Could not delete", description: result.error });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Actions for ${title}`}
        disabled={pending}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`${routes.builder}/${invitationId}`}>
            <Pencil aria-hidden="true" />
            Open and rename
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
