import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/config";
import { facetLabel } from "../labels";
import {
  buildQueryString,
  toggleFilter,
  clearFilters,
  activeFilterCount,
  ORIENTATIONS,
  TIERS,
  type Criteria,
} from "../criteria";

/**
 * Filters — Ph2.md §4.
 *
 * Every control is a <Link>, not a checkbox with an onChange. That is the
 * reason this is a Server Component and ships no JavaScript: filtering works
 * before hydration, each state is a real URL, and the back button behaves.
 * The cost is a navigation per click, which Next handles as a client-side
 * transition anyway.
 *
 * Adding a filter here is a `<FilterGroup>` plus a field in criteria.ts and a
 * clause in query.ts — Ph2.md §4's "Future filters should be easily added".
 */

const ORIENTATION_LABELS: Record<(typeof ORIENTATIONS)[number], string> = {
  portrait: "Portrait",
  landscape: "Landscape",
  square: "Square",
};

const TIER_LABELS: Record<(typeof TIERS)[number], string> = {
  free: "Free",
  premium: "Premium",
};

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border",
          active ? "border-foreground bg-foreground" : "border-border",
        )}
        aria-hidden="true"
      >
        {active ? <Check className="size-3 text-background" /> : null}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function FilterPanel({
  criteria,
  categories,
  facets,
  showFavorites,
}: {
  criteria: Criteria;
  categories: { slug: string; name: string }[];
  facets: { colors: string[]; styles: string[] };
  /** Favourites need an account to filter on. */
  showFavorites: boolean;
}) {
  const href = (next: Criteria) =>
    `${routes.templates}${buildQueryString(next)}`;
  const activeCount = activeFilterCount(criteria);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold">Filters</h2>
        {activeCount > 0 ? (
          <Link
            href={href(clearFilters(criteria))}
            scroll={false}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {/* Ph2.md §4 — Event Type. Read from the database, so a new category
          appears here without a code change (§1). */}
      {categories.length > 0 ? (
        <FilterGroup label="Event type">
          {categories.map((category) => (
            <FilterLink
              key={category.slug}
              href={href(toggleFilter(criteria, "category", category.slug))}
              active={criteria.category.includes(category.slug)}
            >
              {category.name}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}

      {/* Ph2.md §4 — Color Theme. Derived from the published catalog, so a
          filter never offers a colour that matches nothing. */}
      {facets.colors.length > 0 ? (
        <FilterGroup label="Colour">
          {facets.colors.map((color) => (
            <FilterLink
              key={color}
              href={href(toggleFilter(criteria, "color", color))}
              active={criteria.color.includes(color)}
            >
              {facetLabel(color)}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}

      {/* Ph2.md §4 — Style. */}
      {facets.styles.length > 0 ? (
        <FilterGroup label="Style">
          {facets.styles.map((style) => (
            <FilterLink
              key={style}
              href={href(toggleFilter(criteria, "style", style))}
              active={criteria.style.includes(style)}
            >
              {facetLabel(style)}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}

      {/* Ph2.md §4 — Orientation. */}
      <FilterGroup label="Orientation">
        {ORIENTATIONS.map((orientation) => (
          <FilterLink
            key={orientation}
            href={href(toggleFilter(criteria, "orientation", orientation))}
            active={criteria.orientation.includes(orientation)}
          >
            {ORIENTATION_LABELS[orientation]}
          </FilterLink>
        ))}
      </FilterGroup>

      {/* Ph2.md §4 — Premium / Free. */}
      <FilterGroup label="Price">
        {TIERS.map((tier) => (
          <FilterLink
            key={tier}
            href={href(toggleFilter(criteria, "tier", tier))}
            active={criteria.tier.includes(tier)}
          >
            {TIER_LABELS[tier]}
          </FilterLink>
        ))}
      </FilterGroup>

      {/* Ph2.md §4 — Recently Added, and §9 — Favourites. */}
      <FilterGroup label="Show">
        <FilterLink
          href={href({ ...criteria, recent: !criteria.recent, page: 1 })}
          active={criteria.recent}
        >
          Recently added
        </FilterLink>
        {showFavorites ? (
          <FilterLink
            href={href({
              ...criteria,
              favorites: !criteria.favorites,
              page: 1,
            })}
            active={criteria.favorites}
          >
            My favourites
          </FilterLink>
        ) : null}
      </FilterGroup>
    </div>
  );
}
