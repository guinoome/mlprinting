import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import { isNewTemplate } from "../query";
import { FavoriteButton } from "./favorite-button";
import type { TemplateCard as TemplateCardData } from "../repository";

/**
 * Template card — Ph2.md §2.
 *
 * Every element §2 asks for: cover, name, category, short description, preview,
 * use, favourite. "Preview" is the card itself — the whole card links to the
 * preview page, because a separate Preview button next to a clickable card is
 * two controls doing one job.
 */

/** Aspect per orientation, so a landscape template is not letterboxed into a portrait frame. */
const ASPECT = {
  PORTRAIT: "aspect-[4/5]",
  LANDSCAPE: "aspect-[4/3]",
  SQUARE: "aspect-square",
} as const;

export function TemplateCard({
  template,
  favorited,
  showFavorite,
  priority,
}: {
  template: NonNullable<TemplateCardData>;
  favorited: boolean;
  /** Only signed-in visitors get a heart — there is nowhere to save it otherwise. */
  showFavorite: boolean;
  /**
   * Skip lazy-loading for the first row. Ph2.md §10 asks for lazy images, but
   * lazy-loading what is already on screen delays the largest paint the visitor
   * is actually waiting for.
   */
  priority?: boolean;
}) {
  const isNew = isNewTemplate(template.publishedAt);

  // Cover art is a first-party SVG from /api/placeholder (a pure function of the
  // URL, already immutable-cached). Routing it through next/image's optimizer
  // adds a serverless /_next/image hop per card and gains nothing — SVG is not
  // rasterised. Load it directly. Real raster photos, when they arrive, keep the
  // optimizer.
  const isVectorCover = template.coverImageUrl.startsWith("/api/placeholder/");

  return (
    <article className="group relative">
      <Link
        href={routes.template(template.slug)}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-muted",
            ASPECT[template.orientation],
          )}
        >
          <Image
            src={template.coverImageUrl}
            alt=""
            fill
            // Tells the browser the rendered width per breakpoint so it does not
            // fetch a 600px image for a 280px slot (Ph2.md §10).
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            unoptimized={isVectorCover}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {template.tier === "PREMIUM" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background backdrop-blur">
                <Sparkles className="size-3" aria-hidden="true" />
                Premium
              </span>
            ) : null}
            {isNew ? (
              <span className="rounded-full bg-info/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-foreground backdrop-blur">
                New
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Outside the Link: a button inside an anchor is invalid HTML, and the
          click handling that makes it "work" anyway is a keyboard trap. */}
      {showFavorite ? (
        <FavoriteButton
          slug={template.slug}
          initialFavorited={favorited}
          className="absolute right-2 top-2"
        />
      ) : null}

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">
            <Link
              href={routes.template(template.slug)}
              className="hover:underline"
            >
              {template.name}
            </Link>
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {template.category.name}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {template.shortDescription}
        </p>
      </div>
    </article>
  );
}
