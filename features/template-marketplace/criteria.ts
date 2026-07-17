import { z } from "zod";

/**
 * Marketplace search criteria — Ph2.md §3, §4, §5.
 *
 * The URL is the state. Every filter, the sort, and the page live in search
 * params, which buys three things a client-side filter store does not: a
 * shareable link, a working back button, and a server-rendered first paint with
 * the right results already in the HTML.
 *
 * This module is pure — no Prisma, no React. It turns untrusted query strings
 * into a typed, validated shape, and it is the single place that decides what a
 * valid marketplace query *is*.
 */

/** Ph2.md §5. */
export const SORTS = [
  "recommended",
  "popular",
  "newest",
  "alphabetical",
] as const;
export type Sort = (typeof SORTS)[number];

/** Ph2.md §4 — Premium / Free. */
export const TIERS = ["free", "premium"] as const;
export type TierFilter = (typeof TIERS)[number];

export const ORIENTATIONS = ["portrait", "landscape", "square"] as const;
export type OrientationFilter = (typeof ORIENTATIONS)[number];

export const DEFAULT_SORT: Sort = "recommended";
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/**
 * How recent counts as "New" (Ph2.md §1) and as "Recently Added" (§4).
 * One number, one meaning — two thresholds that drift apart would let a
 * template be New on the card and absent from the Recently Added filter.
 */
export const NEW_WINDOW_DAYS = 30;

/**
 * A search term longer than this is not a search, it is a payload. The limit is
 * generous for real queries and cheap insurance against someone posting a novel
 * into an ILIKE across five columns.
 */
const MAX_SEARCH_LENGTH = 100;

/**
 * Repeatable params arrive as `?color=blush&color=ivory` (string[]) or
 * `?color=blush` (string). Normalise both to an array, drop blanks, lowercase,
 * and de-duplicate — `?color=blush&color=BLUSH` is one filter, not two.
 */
const multi = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [];
    const list = Array.isArray(value) ? value : [value];
    const cleaned = list
      .flatMap((item) => item.split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set(cleaned)];
  });

/** Keep only values from a known vocabulary. An unknown one is dropped, not an error. */
function known<T extends string>(allowed: readonly T[]) {
  return (values: string[]): T[] =>
    values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export const criteriaSchema = z.object({
  /** Free-text — Ph2.md §3. */
  q: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined),

  /** Category slugs — Ph2.md §4 Event Type. Not validated against a list here:
   *  categories are rows (see schema.prisma), so the valid set is a database
   *  question, and an unknown slug simply matches nothing. */
  category: multi,

  /** Ph2.md §4 Color Theme. */
  color: multi,
  /** Ph2.md §4 Style. */
  style: multi,

  /** Ph2.md §4 Orientation. */
  orientation: multi.transform(known(ORIENTATIONS)),
  /** Ph2.md §4 Premium / Free. */
  tier: multi.transform(known(TIERS)),

  /** Ph2.md §4 Recently Added. */
  recent: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v) === "1"),

  /** Ph2.md §9 — show only the caller's favourites. Requires a session. */
  favorites: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v) === "1"),

  sort: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v))
    .transform((v): Sort =>
      (SORTS as readonly string[]).includes(v ?? "")
        ? (v as Sort)
        : DEFAULT_SORT,
    ),

  page: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v))
    .transform((v) => {
      const parsed = Number.parseInt(v ?? "1", 10);
      // Page 0, page -3, and page "banana" are all page 1. A bad page number is
      // a broken link, not something worth a 400 in the user's face.
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }),

  perPage: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v))
    .transform((v) => {
      const parsed = Number.parseInt(v ?? "", 10);
      if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
      // Clamped: ?perPage=100000 is a request to scan the catalog.
      return Math.min(parsed, MAX_PAGE_SIZE);
    }),
});

export type Criteria = z.infer<typeof criteriaSchema>;

/** Next.js hands page components this shape. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Parse untrusted search params into criteria.
 *
 * Never throws. Every field has a fallback, because these values come from a
 * URL a stranger can edit, and a marketplace that 500s on `?page=-1` is a
 * marketplace with a trivially findable error page.
 */
export function parseCriteria(params: RawSearchParams): Criteria {
  const result = criteriaSchema.safeParse(params);
  if (result.success) return result.data;

  // Unreachable in practice — every field is optional with a fallback. If a
  // future field breaks that property, fall back to a valid empty query rather
  // than take the page down.
  return criteriaSchema.parse({});
}

/** True when no filter or search narrows the catalog. Drives the empty state copy. */
export function isUnfiltered(criteria: Criteria): boolean {
  return (
    !criteria.q &&
    criteria.category.length === 0 &&
    criteria.color.length === 0 &&
    criteria.style.length === 0 &&
    criteria.orientation.length === 0 &&
    criteria.tier.length === 0 &&
    !criteria.recent &&
    !criteria.favorites
  );
}

/** How many filters are active — shown on the mobile filter button. */
export function activeFilterCount(criteria: Criteria): number {
  return (
    criteria.category.length +
    criteria.color.length +
    criteria.style.length +
    criteria.orientation.length +
    criteria.tier.length +
    (criteria.recent ? 1 : 0) +
    (criteria.favorites ? 1 : 0)
  );
}

/**
 * Build a marketplace URL from criteria plus an override.
 *
 * Defaults are omitted from the query string, so the canonical catalog URL is
 * `/templates` and not `/templates?sort=recommended&page=1&perPage=12`. Two URLs
 * for one page is two cache entries and one confusing share.
 */
export function buildQueryString(
  criteria: Criteria,
  overrides: Partial<Criteria> = {},
): string {
  const merged = { ...criteria, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  for (const value of merged.category) params.append("category", value);
  for (const value of merged.color) params.append("color", value);
  for (const value of merged.style) params.append("style", value);
  for (const value of merged.orientation) params.append("orientation", value);
  for (const value of merged.tier) params.append("tier", value);
  if (merged.recent) params.set("recent", "1");
  if (merged.favorites) params.set("favorites", "1");
  if (merged.sort !== DEFAULT_SORT) params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.perPage !== DEFAULT_PAGE_SIZE)
    params.set("perPage", String(merged.perPage));

  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Toggle one value of a multi-select filter, returning new criteria.
 *
 * Resets to page 1: keeping the page while narrowing the results is how a user
 * lands on an empty page 4 and concludes the filter found nothing.
 */
export function toggleFilter(
  criteria: Criteria,
  key: "category" | "color" | "style" | "orientation" | "tier",
  value: string,
): Criteria {
  const current = criteria[key] as string[];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  return { ...criteria, [key]: next, page: 1 } as Criteria;
}

/** Clear every filter, keeping the sort. */
export function clearFilters(criteria: Criteria): Criteria {
  return {
    ...criteria,
    q: undefined,
    category: [],
    color: [],
    style: [],
    orientation: [],
    tier: [],
    recent: false,
    favorites: false,
    page: 1,
  };
}
