import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
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
      <CatalogHero
        categories={categories}
        activeCategories={criteria.category}
      />

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
            /* Two columns even on the narrowest phone. A 4:5 thumbnail at half
               of 375px is still large enough to judge a design by, and twice as
               many designs pass under the thumb per scroll — which is the point
               of browsing by picture. */
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {templates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  favorited={favorited.has(template.id)}
                  showFavorite={Boolean(profile)}
                  priority={index < ABOVE_THE_FOLD}
                  layout={
                    isUnfiltered(criteria) && index >= 2 ? "wide" : "standard"
                  }
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
    <section className="relative -mx-4 mb-12 overflow-hidden bg-[#ece6db] px-5 pb-0 pt-14 text-[#171713] md:-mx-8 md:px-10 md:pt-20">
      <div className="relative z-10 grid min-h-[32rem] gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center">
        <div className="pb-12 md:pb-20">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
            {branding.company} — {branding.location}
          </p>

          <h1 className="mt-5 max-w-xl text-balance font-serif text-5xl leading-[.94] tracking-[-.04em] md:text-7xl">
            Find the experience that feels like your story.
          </h1>

          <p className="text-black/58 mt-6 max-w-md text-pretty text-sm leading-7">
            Every design begins with its own opening, visual language, and guest
            journey. Four are live now; more join through thoughtfully crafted
            releases.
          </p>
        </div>

        <div className="relative min-h-[24rem] self-stretch md:min-h-full">
          <Image
            src="/experiences/capiz-window-catalogue.png"
            alt="Capiz Window Filipino wedding experience"
            fill
            priority
            sizes="(min-width: 768px) 60vw, 100vw"
            className="object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#ece6db] via-transparent to-transparent" />
        </div>
      </div>

      {/* One scrolling line on a phone, wrapped rows once there is room.
          Sixteen occasions wrapped on a 375px screen pushed the templates
          themselves below the fold. Scrolls within itself; the page does not. */}
      {categories.length > 0 ? (
        <ul className="relative z-20 -mx-5 flex gap-6 overflow-x-auto border-t border-black/15 bg-[#f7f3ec] px-5 py-5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden">
          <li className="shrink-0">
            <Link
              href={routes.templates}
              className={cn(
                "inline-block shrink-0 whitespace-nowrap border-b py-1 text-[9px] font-semibold uppercase tracking-[.2em] transition-colors",
                noneActive
                  ? "border-[#a4773c] text-black"
                  : "border-transparent text-black/45 hover:border-black/30 hover:text-black",
              )}
            >
              All
            </Link>
          </li>
          {categories.map((category) => {
            const active = activeCategories.includes(category.slug);
            return (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={`${routes.templates}?category=${category.slug}`}
                  className={cn(
                    "inline-block shrink-0 whitespace-nowrap border-b py-1 text-[9px] font-semibold uppercase tracking-[.2em] transition-colors",
                    active
                      ? "border-[#a4773c] text-black"
                      : "border-transparent text-black/45 hover:border-black/30 hover:text-black",
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
