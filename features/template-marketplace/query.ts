import type { Prisma } from "@prisma/client";
import type { Criteria, Sort } from "./criteria";
import { NEW_WINDOW_DAYS } from "./criteria";

/**
 * Criteria → Prisma query — Ph2.md §3, §4, §5.
 *
 * Pure functions, so the whole filter and sort surface is unit-testable without
 * a database. Ph2.md asks twice for this layer to stay extensible ("Search
 * architecture must remain extensible", "Future filters should be easily
 * added"): a new filter is one clause pushed onto `and` below, plus one field
 * in criteria.ts. Nothing else in the app changes.
 */

/** The cutoff for "New" (§1) and "Recently Added" (§4). */
export function newSince(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - NEW_WINDOW_DAYS);
  return cutoff;
}

export function isNewTemplate(
  publishedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!publishedAt) return false;
  return publishedAt >= newSince(now);
}

/**
 * Free-text search — Ph2.md §3 (name, category, theme, style, color).
 *
 * Every term must match somewhere, but not all in the same field: "blush
 * wedding" should find a wedding template tagged blush. That is why the terms
 * are AND-ed and the fields inside each term are OR-ed, rather than the whole
 * phrase being matched against each field.
 *
 * `contains` is a trailing-wildcard ILIKE. It does not rank, stem, or tolerate
 * a typo — a Postgres tsvector or a search service would. That is a deliberate
 * Phase 2 ceiling: the catalog is dozens of templates, not millions, and this
 * function is the only place that would change.
 */
function searchClause(q: string): Prisma.TemplateWhereInput {
  const terms = q.split(/\s+/).filter(Boolean);

  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { shortDescription: { contains: term, mode: "insensitive" } },
        { designer: { contains: term, mode: "insensitive" } },
        { category: { name: { contains: term, mode: "insensitive" } } },
        // Array columns match a whole element, not a substring of one. A tag is
        // already an atom ("blush"), so this is the right comparison — and it
        // is why the term is lowercased: `has` is case-sensitive.
        { tags: { has: term.toLowerCase() } },
        { colors: { has: term.toLowerCase() } },
        { styles: { has: term.toLowerCase() } },
      ],
    })),
  };
}

const ORIENTATION_MAP = {
  portrait: "PORTRAIT",
  landscape: "LANDSCAPE",
  square: "SQUARE",
} as const;

const TIER_MAP = {
  free: "FREE",
  premium: "PREMIUM",
} as const;

export interface BuildWhereOptions {
  /** Present only when filtering to favourites (Ph2.md §9). */
  profileId?: string;
  /** Injectable for deterministic tests. */
  now?: Date;
}

/**
 * Build the `where` for a catalog query.
 *
 * `publishedAt` is always constrained, in every branch. An unpublished template
 * is a draft, and a draft leaking into the marketplace is the failure mode this
 * function exists to prevent — so the check is not a filter the caller opts
 * into, it is the first clause and it is unconditional.
 */
export function buildWhere(
  criteria: Criteria,
  { profileId, now = new Date() }: BuildWhereOptions = {},
): Prisma.TemplateWhereInput {
  const and: Prisma.TemplateWhereInput[] = [
    { publishedAt: { not: null, lte: now } },
  ];

  if (criteria.q) and.push(searchClause(criteria.q));

  if (criteria.category.length > 0) {
    and.push({ category: { slug: { in: criteria.category } } });
  }

  // hasSome, not hasEvery: picking blush and ivory means "either", which is how
  // a shopper reads two ticked colour boxes. hasEvery would return nothing for
  // most pairs and read as broken.
  if (criteria.color.length > 0)
    and.push({ colors: { hasSome: criteria.color } });
  if (criteria.style.length > 0)
    and.push({ styles: { hasSome: criteria.style } });

  if (criteria.orientation.length > 0) {
    and.push({
      orientation: { in: criteria.orientation.map((o) => ORIENTATION_MAP[o]) },
    });
  }

  if (criteria.tier.length > 0) {
    and.push({ tier: { in: criteria.tier.map((t) => TIER_MAP[t]) } });
  }

  if (criteria.recent) and.push({ publishedAt: { gte: newSince(now) } });

  if (criteria.favorites) {
    // Without a session there are no favourites to show. Match nothing rather
    // than silently ignore the filter — ignoring it would render the full
    // catalog under a "Favourites" heading.
    and.push(
      profileId ? { favorites: { some: { profileId } } } : { id: { in: [] } },
    );
  }

  return { AND: and };
}

/**
 * Build the `orderBy` for a catalog query — Ph2.md §5.
 *
 * Every branch ends with a unique tiebreaker (`slug`). Without one, rows with
 * equal sort values have no defined order between pages, and a template can
 * appear on both page 1 and page 2 while another never appears at all. That bug
 * looks like a data problem and is a query problem.
 */
export function buildOrderBy(
  sort: Sort,
): Prisma.TemplateOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ useCount: "desc" }, { publishedAt: "desc" }, { slug: "asc" }];

    case "newest":
      return [{ publishedAt: "desc" }, { slug: "asc" }];

    case "alphabetical":
      return [{ name: "asc" }, { slug: "asc" }];

    case "recommended":
    default:
      // The default view, and the only sort that is a judgement rather than a
      // fact: featured first, then popular, then fresh. Personalised ranking is
      // services/recommendations — this is the anonymous, cacheable ordering.
      return [
        { isFeatured: "desc" },
        { useCount: "desc" },
        { publishedAt: "desc" },
        { slug: "asc" },
      ];
  }
}

/** Offset pagination — Ph2.md §10. */
export function buildPagination(criteria: Criteria): {
  skip: number;
  take: number;
} {
  return {
    skip: (criteria.page - 1) * criteria.perPage,
    take: criteria.perPage,
  };
}

export function totalPages(totalCount: number, perPage: number): number {
  if (totalCount <= 0) return 1;
  return Math.ceil(totalCount / perPage);
}
