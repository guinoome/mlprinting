"use client";

import { Play, Plus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Template } from "../types";

/** Portrait is 4:5; square templates keep their own frame so the grid stays honest. */
const ASPECT = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
} as const;

export function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (template: Template) => void;
}) {
  return (
    <figure className="group">
      <button
        type="button"
        onClick={() => onSelect(template)}
        aria-label={`Preview ${template.title}`}
        className={cn(
          "relative block w-full overflow-hidden rounded-xl border border-border bg-muted text-left shadow-sm transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ASPECT[template.orientation],
        )}
      >
        {/* The thumbnail is a first-party SVG from our own renderer, so it is
            loaded directly rather than through the image optimizer, which would
            add a serverless hop and rasterise nothing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {template.isPro ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background backdrop-blur">
            <Crown className="size-3" aria-hidden="true" />
            Pro
          </span>
        ) : null}

        {template.isAnimated ? (
          <span
            className="absolute bottom-2 left-2 inline-flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur"
            title="Animated template"
          >
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            <span className="sr-only">Animated</span>
          </span>
        ) : null}
      </button>

      <figcaption className="mt-2 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {template.title}
        </p>
        <span className="flex gap-1" aria-hidden="true">
          {template.colorPalette.map((hex) => (
            <span
              key={hex}
              className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: hex }}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * The first tile in the grid.
 *
 * Deliberately a card and not a button in the toolbar: someone who wants to
 * start from nothing is scanning the grid like everyone else, and this is where
 * their eyes already are.
 */
export function BlankInvitationCard({
  orientation = "portrait",
  onSelect,
}: {
  orientation?: Template["orientation"];
  onSelect: () => void;
}) {
  return (
    <figure className="group">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ASPECT[orientation],
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-background">
          <Plus className="size-5" aria-hidden="true" />
        </span>
        <span className="px-4 text-center text-sm font-medium">
          Create a blank invitation
        </span>
      </button>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        Start from scratch
      </figcaption>
    </figure>
  );
}
