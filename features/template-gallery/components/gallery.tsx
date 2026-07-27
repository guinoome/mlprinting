"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  matchesFilters,
  type Category,
  type GalleryFilters,
  type Style,
  type Template,
} from "../types";
import { EXPLORE_LINKS, MOCK_TEMPLATES, PAGE_SIZE } from "../mock-data";
import { BlankInvitationCard, TemplateCard } from "./template-card";
import { FilterPanel } from "./filter-panel";
import { InvitationLayout, SAMPLE_CONTENT } from "./invitation-layout";

/**
 * The virtual invitation gallery.
 *
 * Client-side because every control here is instant: filtering a list this size
 * over the network would add a round trip to a keystroke. When it moves onto the
 * real catalogue the filtering goes server-side and this component keeps its
 * shape — the props change, the layout does not.
 */
export function Gallery() {
  const [filters, setFilters] = React.useState<GalleryFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = React.useState(false);
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [preview, setPreview] = React.useState<Template | null>(null);

  const results = React.useMemo(
    () => MOCK_TEMPLATES.filter((t) => matchesFilters(t, filters)),
    [filters],
  );

  // Any change to the query or the filters is a new result set, so the reveal
  // count has to reset — leaving it would show page three of a list the visitor
  // has never seen page one of.
  React.useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters]);

  const shown = results.slice(0, visible);
  const activeCount = activeFilterCount(filters);
  const hasMore = visible < results.length;

  const apply = (patch: Partial<GalleryFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const exploreTo = (query: string) => {
    const [key, value] = query.split("=");
    setFilters({
      ...EMPTY_FILTERS,
      categories: key === "category" ? [value as Category] : [],
      styles: key === "style" ? [value as Style] : [],
    });
    setShowFilters(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filters.query}
            onChange={(e) => apply({ query: e.target.value })}
            placeholder="Search invitations — try “neon birthday”"
            aria-label="Search invitation templates"
            className="pl-9"
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => apply({ query: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="shrink-0"
        >
          <SlidersHorizontal aria-hidden="true" />
          All filters
          {activeCount > 0 ? (
            <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      {showFilters ? (
        <div className="mt-4">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            onClose={() => setShowFilters(false)}
          />
        </div>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {results.length === 0
          ? "No templates match those filters"
          : `Showing ${shown.length.toLocaleString()} of ${results.length.toLocaleString()}`}
      </p>

      {results.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">Nothing matches those filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try removing one, or search for an occasion instead.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3">
          <BlankInvitationCard onSelect={() => setPreview(null)} />
          {shown.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={setPreview}
            />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          {/* Appends rather than paginating: the visitor keeps the designs they
              have already judged, which is how picture-led browsing works. */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Show more
          </Button>
        </div>
      ) : null}

      <section className="mt-16 border-t border-border pt-8">
        <h2 className="font-serif text-2xl tracking-tight">Explore more</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every link here is a filter this gallery can answer, not a dead end.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {EXPLORE_LINKS.map((link) => (
            <li key={link.query + link.label}>
              <button
                type="button"
                onClick={() => exploreTo(link.query)}
                className={cn(
                  "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground",
                  "transition-colors hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {preview ? (
        <PreviewDialog template={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

/**
 * Preview of the selected design, rendered through the shared layout so the
 * card and the full invitation cannot drift apart.
 */
function PreviewDialog({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={template.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-sm overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <InvitationLayout template={template} content={SAMPLE_CONTENT} />

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-background p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{template.title}</p>
            <p className="text-xs text-muted-foreground">
              {template.isPro ? "Pro" : "Free"}
              {template.isAnimated ? " · Animated" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
