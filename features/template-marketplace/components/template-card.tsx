import Link from "next/link";
import Image from "next/image";
import { Sparkles, PlayCircle } from "lucide-react";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import { isNewTemplate } from "../query";
import { FavoriteButton } from "./favorite-button";
import type { TemplateCard as TemplateCardData } from "../repository";

/**
 * Template card — Ph2.md §2.
 *
 * Every element §2 asks for: cover, name, category, short description, preview,
 * use, favourite. "Preview" is the card itself — the whole cover links to the
 * preview page, because a separate Preview button next to a clickable card is
 * two controls doing one job.
 *
 * The cover link is a stretched anchor over the image rather than a wrapper
 * around it, so the "See it live" pill and the favourite button can sit on top
 * as siblings. An anchor inside an anchor is invalid HTML, and the click
 * handling that makes it "work" anyway is a keyboard trap.
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
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-lg",
          ASPECT[template.orientation],
        )}
      >
        <Image
          src={template.coverImageUrl}
          alt=""
          fill
          // Tells the browser the rendered width per breakpoint so it does not
          // fetch a 600px image for a 280px slot (Ph2.md §10). Tracks the
          // catalogue grid: two columns, three from md, four from xl once the
          // sidebar has taken its 224px.
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          unoptimized={isVectorCover}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* A scrim only under the pill, and only on hover, so the artwork is
            never dimmed while the visitor is looking at it. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />

        <Link
          href={routes.template(template.slug)}
          className="absolute inset-0 z-10 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="sr-only">{template.name}</span>
        </Link>

        <div
          className={cn(
            "pointer-events-none absolute left-2 top-2 z-20 flex flex-wrap gap-1",
            // Both badges plus the heart no longer fit across one line of a
            // half-width card on a phone. Bound the row where the heart begins
            // so the badges wrap instead of sliding underneath it.
            showFavorite && "right-11",
          )}
        >
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

        {/* The catalogue's strongest argument: the design in motion, one tap
            away. Keyboard users reach it in the normal tab order — it is not
            hidden, only visually revealed on hover. */}
        <Link
          href={routes.templateLivePreview(template.slug)}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-x-2 bottom-2 z-20 inline-flex items-center justify-center gap-1.5 rounded-full bg-background/95 py-2 text-xs font-medium opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 hover:bg-background focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <PlayCircle className="size-3.5" aria-hidden="true" />
          See it live
        </Link>
      </div>

      {showFavorite ? (
        <FavoriteButton
          slug={template.slug}
          initialFavorited={favorited}
          className="absolute right-2 top-2 z-20"
        />
      ) : null}

      {/* Name over occasion rather than name beside it: at half a phone's width
          there is no room for two things on one line, and stacking them makes a
          column of cards read as a list of name and event type. The name gets
          two lines then an ellipsis — clipping it to one cut most names in half
          at that width. */}
      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 text-sm font-semibold">
          <Link
            href={routes.template(template.slug)}
            className="hover:underline"
          >
            {template.name}
          </Link>
        </h3>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {template.category.name}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {template.shortDescription}
        </p>
      </div>
    </article>
  );
}
