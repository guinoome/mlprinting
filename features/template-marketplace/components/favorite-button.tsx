"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "../actions";
import { notify } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Favourite toggle — Ph2.md §2 ("Favorite Button (future-ready)"), §9.
 *
 * Optimistic: the heart fills on click and reverts if the server disagrees.
 * Favouriting is a low-stakes, high-frequency action, and a spinner on a heart
 * costs more than the rare rollback does.
 *
 * Rendered as a real <button> inside the card's <Link>, so the click has to be
 * stopped from navigating — see onClick.
 */
export function FavoriteButton({
  slug,
  initialFavorited,
  className,
}: {
  slug: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = React.useState(initialFavorited);
  const [pending, startTransition] = React.useTransition();

  function onClick(event: React.MouseEvent) {
    // The card is a link. Without this, favouriting also navigates.
    event.preventDefault();
    event.stopPropagation();

    const next = !favorited;
    setFavorited(next); // Optimistic.

    startTransition(async () => {
      const formData = new FormData();
      formData.set("slug", slug);
      const result = await toggleFavorite(formData);

      if (result.error) {
        setFavorited(!next); // Roll back.
        notify.error({
          title: "Could not update favourites",
          description: result.error,
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favourites" : "Save to favourites"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          favorited
            ? "fill-destructive text-destructive"
            : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
