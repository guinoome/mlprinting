import { describe, expect, it } from "vitest";
import {
  buildWhere,
  buildOrderBy,
  buildPagination,
  totalPages,
  newSince,
  isNewTemplate,
} from "./query";
import { parseCriteria } from "./criteria";

const NOW = new Date("2026-07-17T00:00:00.000Z");

/** The AND clauses buildWhere produced, for inspection. */
function clauses(where: ReturnType<typeof buildWhere>) {
  return (where.AND ?? []) as Record<string, unknown>[];
}

/** Find the clause carrying a given key. */
function clauseWith(where: ReturnType<typeof buildWhere>, key: string) {
  return clauses(where).find((c) => key in c);
}

describe("newSince", () => {
  it("is 30 days back", () => {
    expect(newSince(NOW).toISOString()).toBe("2026-06-17T00:00:00.000Z");
  });
});

describe("isNewTemplate", () => {
  it("is true inside the window", () => {
    expect(isNewTemplate(new Date("2026-07-01T00:00:00Z"), NOW)).toBe(true);
  });

  it("is false outside the window", () => {
    expect(isNewTemplate(new Date("2026-01-01T00:00:00Z"), NOW)).toBe(false);
  });

  it("is false for a draft", () => {
    expect(isNewTemplate(null, NOW)).toBe(false);
  });
});

describe("buildWhere — publication", () => {
  it("always constrains publishedAt, even with no filters", () => {
    // The whole point of this function: a draft must never reach the catalog.
    const where = buildWhere(parseCriteria({}), { now: NOW });
    expect(clauseWith(where, "publishedAt")).toEqual({
      publishedAt: { not: null, lte: NOW },
    });
  });

  it("excludes templates scheduled for the future", () => {
    const clause = clauseWith(
      buildWhere(parseCriteria({}), { now: NOW }),
      "publishedAt",
    );
    expect((clause!.publishedAt as { lte: Date }).lte).toEqual(NOW);
  });

  it("still constrains publishedAt when other filters are present", () => {
    const where = buildWhere(
      parseCriteria({ q: "blush", category: "wedding" }),
      { now: NOW },
    );
    expect(clauseWith(where, "publishedAt")).toBeDefined();
  });
});

describe("buildWhere — search (Ph2 §3)", () => {
  it("ANDs the terms so every word must match somewhere", () => {
    const where = buildWhere(parseCriteria({ q: "blush wedding" }), {
      now: NOW,
    });
    const search = clauseWith(where, "AND") as { AND: unknown[] };
    expect(search.AND).toHaveLength(2);
  });

  it("ORs the fields within a term, so 'blush wedding' spans tag and category", () => {
    const where = buildWhere(parseCriteria({ q: "blush" }), { now: NOW });
    const search = clauseWith(where, "AND") as { AND: { OR: unknown[] }[] };
    expect(search.AND[0]!.OR.length).toBeGreaterThan(1);
  });

  it("searches array columns with `has`, lowercased — `has` is case-sensitive", () => {
    const where = buildWhere(parseCriteria({ q: "BLUSH" }), { now: NOW });
    const search = clauseWith(where, "AND") as {
      AND: { OR: Record<string, unknown>[] }[];
    };
    const tagClause = search.AND[0]!.OR.find((o) => "tags" in o);
    expect(tagClause).toEqual({ tags: { has: "blush" } });
  });

  it("searches text columns case-insensitively", () => {
    const where = buildWhere(parseCriteria({ q: "blush" }), { now: NOW });
    const search = clauseWith(where, "AND") as {
      AND: { OR: Record<string, unknown>[] }[];
    };
    const nameClause = search.AND[0]!.OR.find((o) => "name" in o);
    expect(nameClause).toEqual({
      name: { contains: "blush", mode: "insensitive" },
    });
  });

  it("adds no search clause when there is no term", () => {
    const where = buildWhere(parseCriteria({}), { now: NOW });
    expect(clauseWith(where, "AND")).toBeUndefined();
  });
});

describe("buildWhere — filters (Ph2 §4)", () => {
  it("filters by category slug", () => {
    const where = buildWhere(
      parseCriteria({ category: ["wedding", "debut"] }),
      { now: NOW },
    );
    expect(clauseWith(where, "category")).toEqual({
      category: { slug: { in: ["wedding", "debut"] } },
    });
  });

  it("treats multiple colours as OR, which is how two ticked boxes read", () => {
    // hasEvery would demand a template be both blush AND ivory, returning
    // nothing for most pairs and looking broken.
    const where = buildWhere(parseCriteria({ color: ["blush", "ivory"] }), {
      now: NOW,
    });
    expect(clauseWith(where, "colors")).toEqual({
      colors: { hasSome: ["blush", "ivory"] },
    });
  });

  it("treats multiple styles as OR", () => {
    const where = buildWhere(parseCriteria({ style: ["modern", "rustic"] }), {
      now: NOW,
    });
    expect(clauseWith(where, "styles")).toEqual({
      styles: { hasSome: ["modern", "rustic"] },
    });
  });

  it("maps orientation to the enum", () => {
    const where = buildWhere(
      parseCriteria({ orientation: ["portrait", "square"] }),
      { now: NOW },
    );
    expect(clauseWith(where, "orientation")).toEqual({
      orientation: { in: ["PORTRAIT", "SQUARE"] },
    });
  });

  it("maps tier to the enum", () => {
    const where = buildWhere(parseCriteria({ tier: "premium" }), { now: NOW });
    expect(clauseWith(where, "tier")).toEqual({ tier: { in: ["PREMIUM"] } });
  });

  it("adds a recency floor for Recently Added", () => {
    const where = buildWhere(parseCriteria({ recent: "1" }), { now: NOW });
    const recent = clauses(where).filter((c) => "publishedAt" in c);
    // Two publishedAt clauses: the unconditional publication check, plus this.
    expect(recent).toHaveLength(2);
    expect(recent[1]).toEqual({ publishedAt: { gte: newSince(NOW) } });
  });

  it("omits absent filters entirely", () => {
    const where = buildWhere(parseCriteria({}), { now: NOW });
    expect(clauses(where)).toHaveLength(1); // publication only
  });
});

describe("buildWhere — favourites (Ph2 §9)", () => {
  it("scopes to the caller's favourites when signed in", () => {
    const where = buildWhere(parseCriteria({ favorites: "1" }), {
      profileId: "user-1",
      now: NOW,
    });
    expect(clauseWith(where, "favorites")).toEqual({
      favorites: { some: { profileId: "user-1" } },
    });
  });

  it("matches nothing when anonymous, rather than showing the whole catalog", () => {
    // Ignoring the filter would render every template under a "Favourites"
    // heading — worse than an honest empty state.
    const where = buildWhere(parseCriteria({ favorites: "1" }), { now: NOW });
    expect(clauseWith(where, "id")).toEqual({ id: { in: [] } });
  });

  it("does not scope to a profile when the filter is off", () => {
    const where = buildWhere(parseCriteria({}), {
      profileId: "user-1",
      now: NOW,
    });
    expect(clauseWith(where, "favorites")).toBeUndefined();
  });
});

describe("buildOrderBy — Ph2 §5", () => {
  it("orders recommended by featured, then popularity, then freshness", () => {
    expect(buildOrderBy("recommended")).toEqual([
      { isFeatured: "desc" },
      { useCount: "desc" },
      { publishedAt: "desc" },
      { slug: "asc" },
    ]);
  });

  it("orders popular by use count", () => {
    expect(buildOrderBy("popular")[0]).toEqual({ useCount: "desc" });
  });

  it("orders newest by publication date", () => {
    expect(buildOrderBy("newest")[0]).toEqual({ publishedAt: "desc" });
  });

  it("orders alphabetical by name", () => {
    expect(buildOrderBy("alphabetical")[0]).toEqual({ name: "asc" });
  });

  it("ends every sort with a unique tiebreaker", () => {
    // Without one, rows with equal sort values have no stable order across
    // pages: a template can appear on both page 1 and page 2 while another is
    // never shown at all.
    for (const sort of [
      "recommended",
      "popular",
      "newest",
      "alphabetical",
    ] as const) {
      expect(buildOrderBy(sort).at(-1)).toEqual({ slug: "asc" });
    }
  });
});

describe("buildPagination", () => {
  it("does not skip on page 1", () => {
    expect(buildPagination(parseCriteria({}))).toEqual({ skip: 0, take: 12 });
  });

  it("skips whole pages", () => {
    expect(buildPagination(parseCriteria({ page: "3" }))).toEqual({
      skip: 24,
      take: 12,
    });
  });

  it("honours a custom page size", () => {
    expect(
      buildPagination(parseCriteria({ page: "2", perPage: "24" })),
    ).toEqual({
      skip: 24,
      take: 24,
    });
  });
});

describe("totalPages", () => {
  it("rounds up a partial page", () => {
    expect(totalPages(13, 12)).toBe(2);
  });

  it("is exact on a boundary", () => {
    expect(totalPages(24, 12)).toBe(2);
  });

  it("reports one page for an empty catalog, not zero", () => {
    // Zero pages would render "Page 1 of 0".
    expect(totalPages(0, 12)).toBe(1);
  });
});
