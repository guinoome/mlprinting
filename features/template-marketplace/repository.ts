import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getProfile } from "@/lib/auth/session";
import type { Criteria } from "./criteria";
import { buildWhere, buildOrderBy, buildPagination, totalPages } from "./query";

/**
 * Catalog reads — Ph2.md §1, §10.
 *
 * The only module that queries template tables. Pages call this; they never
 * touch Prisma, so the shape a page renders is decided here and the caching
 * policy has exactly one home.
 *
 * Every function degrades to empty rather than throwing. The marketplace is
 * public, and a database blip should cost a visitor the catalog, not the site.
 */

/** Cache tag for everything catalog-shaped. Revalidated when the catalog changes. */
export const CATALOG_TAG = "template-catalog";

/** The columns a card needs (Ph2.md §2) — and no more. `description` is long and unused here. */
const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  coverImageUrl: true,
  tier: true,
  orientation: true,
  isFeatured: true,
  publishedAt: true,
  useCount: true,
  category: { select: { slug: true, name: true } },
} as const;

export type TemplateCard = Awaited<
  ReturnType<typeof prisma.template.findFirst<{ select: typeof CARD_SELECT }>>
>;

export interface CatalogPage {
  templates: NonNullable<TemplateCard>[];
  totalCount: number;
  page: number;
  totalPages: number;
}

const EMPTY_PAGE: CatalogPage = {
  templates: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
};

/**
 * A page of the catalog — Ph2.md §1, §10.
 *
 * Not `unstable_cache`d, deliberately. The result depends on the caller when
 * `favorites=1` is set, and a cache keyed on criteria alone would serve one
 * user's favourites to the next. The expensive, shared parts — categories, and
 * the filter vocabularies — are cached separately below, where they are
 * genuinely anonymous.
 */
export async function getCatalogPage(criteria: Criteria): Promise<CatalogPage> {
  if (!isDatabaseConfigured()) return EMPTY_PAGE;

  // Only resolved when actually needed: getProfile() is a Supabase round trip
  // plus a database write, and the anonymous catalog must not pay for it.
  const profileId = criteria.favorites ? (await getProfile())?.id : undefined;

  const where = buildWhere(criteria, { profileId });
  const { skip, take } = buildPagination(criteria);

  try {
    const [templates, totalCount] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: buildOrderBy(criteria.sort),
        skip,
        take,
        select: CARD_SELECT,
      }),
      prisma.template.count({ where }),
    ]);

    return {
      templates,
      totalCount,
      page: criteria.page,
      totalPages: totalPages(totalCount, criteria.perPage),
    };
  } catch (error) {
    logger.report(error, { at: "getCatalogPage" });
    return EMPTY_PAGE;
  }
}

/**
 * Active categories for the filter list — Ph2.md §1, §4.
 *
 * Cached: identical for every visitor and changes about never, but is read on
 * every marketplace page load. This is what Ph2.md §10 "cache template
 * metadata" is asking for.
 */
export const getCategories = unstable_cache(
  async () => {
    if (!isDatabaseConfigured()) return [];

    try {
      return await prisma.templateCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { slug: true, name: true, description: true },
      });
    } catch (error) {
      logger.report(error, { at: "getCategories" });
      return [];
    }
  },
  ["template-categories"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/**
 * The colour and style vocabularies for the filter UI — Ph2.md §4.
 *
 * Derived from the published catalog rather than hard-coded, so a filter never
 * offers a value that matches nothing, and a new colour on a new template
 * appears in the filters without a code change.
 *
 * Reads two array columns across the catalog and reduces in memory. That is the
 * right trade at this size — the alternative is a Postgres `unnest` through
 * `$queryRaw`, which buys nothing until the catalog is thousands of rows, and
 * this result is cached for an hour regardless.
 */
export const getFacets = unstable_cache(
  async (): Promise<{ colors: string[]; styles: string[] }> => {
    if (!isDatabaseConfigured()) return { colors: [], styles: [] };

    try {
      const rows = await prisma.template.findMany({
        where: { publishedAt: { not: null } },
        select: { colors: true, styles: true },
      });

      return {
        colors: [...new Set(rows.flatMap((r) => r.colors))].sort(),
        styles: [...new Set(rows.flatMap((r) => r.styles))].sort(),
      };
    } catch (error) {
      logger.report(error, { at: "getFacets" });
      return { colors: [], styles: [] };
    }
  },
  ["template-facets"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Full detail for the preview page — Ph2.md §6, §7. */
export const getTemplateBySlug = cache(async (slug: string) => {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.template.findFirst({
      // publishedAt is checked here too. A draft has a slug, and a slug is
      // guessable — "is it published?" is not a question the catalog list can
      // answer on this page's behalf.
      where: { slug, publishedAt: { not: null, lte: new Date() } },
      include: {
        category: { select: { slug: true, name: true } },
        screenshots: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
        collections: {
          include: { collection: { select: { slug: true, name: true } } },
        },
      },
    });
  } catch (error) {
    logger.report(error, { at: "getTemplateBySlug", slug });
    return null;
  }
});

export type TemplateDetail = NonNullable<
  Awaited<ReturnType<typeof getTemplateBySlug>>
>;

/**
 * Which of these templates the caller has favourited — Ph2.md §9.
 *
 * One query for the whole page rather than one per card. The N+1 version works
 * fine with 12 seeded templates and falls over quietly later.
 */
export async function getFavoritedSlugs(
  profileId: string | undefined,
  templateIds: string[],
): Promise<Set<string>> {
  if (!profileId || !isDatabaseConfigured() || templateIds.length === 0) {
    return new Set();
  }

  try {
    const rows = await prisma.templateFavorite.findMany({
      where: { profileId, templateId: { in: templateIds } },
      select: { templateId: true },
    });
    return new Set(rows.map((r) => r.templateId));
  } catch (error) {
    logger.report(error, { at: "getFavoritedSlugs" });
    return new Set();
  }
}
