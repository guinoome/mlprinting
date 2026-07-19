import { z } from "zod";

/**
 * Media search criteria — design doc "Folders, search, and quota" section.
 * Same shape as features/template-marketplace/criteria.ts, applied to the
 * Media Library's own vocabulary. Pure — no Prisma, no React — so the whole
 * filter surface is unit-testable without a database.
 */

export const MEDIA_SORTS = ["newest", "oldest", "largest", "name"] as const;
export type MediaSort = (typeof MEDIA_SORTS)[number];

export const MEDIA_KINDS = ["image", "document", "audio", "video"] as const;
export type MediaKindFilter = (typeof MEDIA_KINDS)[number];

export const DEFAULT_MEDIA_SORT: MediaSort = "newest";
export const DEFAULT_MEDIA_PAGE_SIZE = 40;
export const MAX_MEDIA_PAGE_SIZE = 100;

/** A search term longer than this is not a search, it is a payload. */
const MAX_SEARCH_LENGTH = 100;

/** Repeatable params, normalised to a deduped lowercase array — see criteria.ts's twin in template-marketplace. */
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

function known<T extends string>(allowed: readonly T[]) {
  return (values: string[]): T[] =>
    values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

const single = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v));

export const mediaCriteriaSchema = z.object({
  /** Filename, alt text, and tags — design doc's Search section. */
  q: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined),

  kind: multi.transform(known(MEDIA_KINDS)),
  tag: multi,

  /** An invitation id, or the literal string "unsorted" for zero-usage assets. */
  event: single,

  sort: single.transform((v): MediaSort =>
    (MEDIA_SORTS as readonly string[]).includes(v ?? "")
      ? (v as MediaSort)
      : DEFAULT_MEDIA_SORT,
  ),

  page: single.transform((v) => {
    const parsed = Number.parseInt(v ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }),

  perPage: single.transform((v) => {
    const parsed = Number.parseInt(v ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MEDIA_PAGE_SIZE;
    return Math.min(parsed, MAX_MEDIA_PAGE_SIZE);
  }),
});

export type MediaCriteria = z.infer<typeof mediaCriteriaSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Never throws — every field has a fallback, same guarantee as the marketplace's parseCriteria. */
export function parseMediaCriteria(params: RawSearchParams): MediaCriteria {
  const result = mediaCriteriaSchema.safeParse(params);
  if (result.success) return result.data;
  return mediaCriteriaSchema.parse({});
}
