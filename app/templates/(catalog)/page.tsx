import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LayoutTemplate, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfigurationRequired } from "@/components/configuration-required";
import { isDatabaseConfigured } from "@/lib/db";
import { getProfile } from "@/lib/auth/session";
import { routes, branding } from "@/lib/config";
import {
  parseCriteria,
  buildQueryString,
  clearFilters,
  activeFilterCount,
  isUnfiltered,
  type RawSearchParams,
} from "@/features/template-marketplace/criteria";
import {
  getCatalogPage,
  getCategories,
  getFacets,
  getFavoritedSlugs,
} from "@/features/template-marketplace/repository";
import { TemplateCard } from "@/features/template-marketplace/components/template-card";
import { FilterPanel } from "@/features/template-marketplace/components/filter-panel";
import { SortMenu } from "@/features/template-marketplace/components/sort-menu";
import { Pagination } from "@/features/template-marketplace/components/pagination";
import { SearchInput } from "@/features/template-marketplace/components/search-input";
import { MobileFilters } from "@/features/template-marketplace/components/mobile-filters";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Browse invitation templates for weddings, birthdays, debuts, and more.",
};

/** Cards in the first row, which should not be lazy-loaded. */
const ABOVE_THE_FOLD = 4;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  if (!isDatabaseConfigured()) return <ConfigurationRequired />;

  const criteria = parseCriteria(searchParams);

  // Categories and facets are cached and shared; the page of results is not.
  // Fetched together so the three round trips overlap.
  const [categories, facets, profile] = await Promise.all([
    getCategories(),
    getFacets(),
    getProfile(),
  ]);

  const { templates, totalCount, totalPages } = await getCatalogPage(criteria);
  const favorited = await getFavoritedSlugs(
    profile?.id,
    templates.map((t) => t.id),
  );

  const filters = (
    <FilterPanel
      criteria={criteria}
      categories={categories}
      facets={facets}
      showFavorites={Boolean(profile)}
    />
  );

  return (
    <>
      <CatalogHero categories={categories} activeCategories={criteria.category} />

      <div className="flex gap-8">
        {/* Sidebar filters on desktop. The same panel goes in the drawer below. */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">{filters}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 space-y-3">
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <SearchInput initialQuery={criteria.q} />
            </Suspense>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {totalCount === 0
                  ? "No templates"
                  : `${totalCount} template${totalCount === 1 ? "" : "s"}`}
              </p>

              <div className="flex items-center gap-2">
                <Suspense fallback={null}>
                  <MobileFilters activeCount={activeFilterCount(criteria)}>
                    {filters}
                  </MobileFilters>
                </Suspense>
                <SortMenu criteria={criteria} />
              </div>
            </div>
          </div>

          {templates.length === 0 ? (
            <CatalogEmptyState criteria={criteria} />
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  favorited={favorited.has(template.id)}
                  showFavorite={Boolean(profile)}
                  priority={index < ABOVE_THE_FOLD}
                />
              ))}
            </div>
          )}

          <Pagination criteria={criteria} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}

/**
 * The catalogue's opening — the shop window.
 *
 * A plain page title tells a visitor where they are; this tells them what is on
 * offer and lets them jump straight to their own occasion, which is the first
 * thing anyone shopping for an invitation actually wants. The category row is
 * built from the same live categories the filter panel uses, so it can never
 * offer an occasion the catalogue does not stock.
 */
function CatalogHero({
  categories,
  activeCategories,
}: {
  categories: { slug: string; name: string }[];
  /** Category filter is multi-select, so this is the selected set, not one value. */
  activeCategories: string[];
}) {
  const noneActive = activeCategories.length === 0;
  return (
    <section className="mb-10 border-b border-border pb-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
        {branding.company} — {branding.location}
      </p>

      <h1 className="mt-4 max-w-2xl text-balance font-serif text-4xl leading-[1.1] tracking-tight md:text-5xl">
        Invitations worth opening.
      </h1>

      <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
        Every design here becomes a shareable animated invitation — an envelope
        that opens, a countdown, and RSVPs that come straight back to you. Print
        it too, if you like.
      </p>

      {categories.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          <li>
            <Link
              href={routes.templates}
              className={cn(
                "inline-block rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                noneActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              All
            </Link>
          </li>
          {categories.map((category) => {
            const active = activeCategories.includes(category.slug);
            return (
              <li key={category.slug}>
                <Link
                  href={`${routes.templates}?category=${category.slug}`}
                  className={cn(
                    "inline-block rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Three different empty states, because they need three different answers:
 * an empty catalog is our problem, an over-filtered search is a nudge to widen,
 * and no favourites is an invitation to save one.
 */
function CatalogEmptyState({
  criteria,
}: {
  criteria: ReturnType<typeof parseCriteria>;
}) {
  if (criteria.favorites) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title="No favourites yet"
        description="Tap the heart on any template to save it here."
        action={
          <Button asChild variant="outline">
            <Link
              href={`${routes.templates}${buildQueryString(clearFilters(criteria))}`}
            >
              Browse all templates
            </Link>
          </Button>
        }
      />
    );
  }

  if (!isUnfiltered(criteria)) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Nothing matches those filters"
        description="Try removing a filter or searching for something broader."
        action={
          <Button asChild variant="outline">
            <Link
              href={`${routes.templates}${buildQueryString(clearFilters(criteria))}`}
            >
              Clear filters
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<LayoutTemplate />}
      title="No templates published yet"
      description="The catalogue is being prepared. Check back shortly."
    />
  );
}
