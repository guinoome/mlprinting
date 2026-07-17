import { describe, expect, it } from "vitest";
import {
  parseCriteria,
  buildQueryString,
  toggleFilter,
  clearFilters,
  isUnfiltered,
  activeFilterCount,
  DEFAULT_SORT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type RawSearchParams,
} from "./criteria";

/**
 * Turn a query string into the shape Next.js hands a page component.
 *
 * Not `Object.fromEntries(new URLSearchParams(...))` — that keeps only the last
 * value of a repeated key, so `?color=blush&color=ivory` would arrive as
 * "ivory" and quietly weaken any round-trip assertion. Next gives a string[]
 * for repeated params, and this mirrors that.
 */
function toSearchParams(queryString: string): RawSearchParams {
  const params = new URLSearchParams(queryString.replace(/^\?/, ""));
  const result: RawSearchParams = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

describe("parseCriteria — defaults", () => {
  it("returns a valid empty query for no params", () => {
    const criteria = parseCriteria({});

    expect(criteria.q).toBeUndefined();
    expect(criteria.category).toEqual([]);
    expect(criteria.sort).toBe(DEFAULT_SORT);
    expect(criteria.page).toBe(1);
    expect(criteria.perPage).toBe(DEFAULT_PAGE_SIZE);
    expect(criteria.recent).toBe(false);
    expect(criteria.favorites).toBe(false);
  });

  it("never throws on hostile input", () => {
    // These all come from a URL a stranger can edit.
    expect(() => parseCriteria({ page: "banana" })).not.toThrow();
    expect(() =>
      parseCriteria({ sort: "'; drop table templates--" }),
    ).not.toThrow();
    expect(() => parseCriteria({ perPage: "-5" })).not.toThrow();
    expect(() => parseCriteria({ category: [] })).not.toThrow();
  });
});

describe("parseCriteria — search term", () => {
  it("trims", () => {
    expect(parseCriteria({ q: "  wedding  " }).q).toBe("wedding");
  });

  it("treats a blank term as absent, not as an empty search", () => {
    expect(parseCriteria({ q: "" }).q).toBeUndefined();
    expect(parseCriteria({ q: "   " }).q).toBeUndefined();
  });

  it("truncates an overlong term rather than searching on it", () => {
    expect(parseCriteria({ q: "a".repeat(500) }).q).toHaveLength(100);
  });
});

describe("parseCriteria — multi-value filters", () => {
  it("accepts a single value", () => {
    expect(parseCriteria({ color: "blush" }).color).toEqual(["blush"]);
  });

  it("accepts repeated params", () => {
    expect(parseCriteria({ color: ["blush", "ivory"] }).color).toEqual([
      "blush",
      "ivory",
    ]);
  });

  it("accepts a comma-separated list", () => {
    expect(parseCriteria({ color: "blush,ivory" }).color).toEqual([
      "blush",
      "ivory",
    ]);
  });

  it("lowercases and de-duplicates, so ?color=blush&color=BLUSH is one filter", () => {
    expect(parseCriteria({ color: ["blush", "BLUSH", "Blush"] }).color).toEqual(
      ["blush"],
    );
  });

  it("drops blanks", () => {
    expect(parseCriteria({ color: "blush,,  ,ivory" }).color).toEqual([
      "blush",
      "ivory",
    ]);
  });
});

describe("parseCriteria — closed vocabularies", () => {
  it("keeps known orientations and drops unknown ones", () => {
    expect(
      parseCriteria({ orientation: ["portrait", "hexagonal"] }).orientation,
    ).toEqual(["portrait"]);
  });

  it("keeps known tiers and drops unknown ones", () => {
    expect(parseCriteria({ tier: ["premium", "free", "gold"] }).tier).toEqual([
      "premium",
      "free",
    ]);
  });

  it("does not validate category slugs — those are database rows, not a code list", () => {
    // An unknown category matches nothing at query time. Rejecting it here would
    // mean adding a category required a code change, which Ph2 §1 forbids.
    expect(parseCriteria({ category: "reunion" }).category).toEqual([
      "reunion",
    ]);
  });
});

describe("parseCriteria — sort", () => {
  it("accepts every documented sort", () => {
    for (const sort of ["recommended", "popular", "newest", "alphabetical"]) {
      expect(parseCriteria({ sort }).sort).toBe(sort);
    }
  });

  it("falls back to the default for an unknown sort", () => {
    expect(parseCriteria({ sort: "cheapest" }).sort).toBe(DEFAULT_SORT);
  });
});

describe("parseCriteria — pagination", () => {
  it("parses a page number", () => {
    expect(parseCriteria({ page: "3" }).page).toBe(3);
  });

  it("treats junk, zero, and negative pages as page 1", () => {
    expect(parseCriteria({ page: "banana" }).page).toBe(1);
    expect(parseCriteria({ page: "0" }).page).toBe(1);
    expect(parseCriteria({ page: "-4" }).page).toBe(1);
  });

  it("clamps perPage so ?perPage=100000 cannot scan the catalog", () => {
    expect(parseCriteria({ perPage: "100000" }).perPage).toBe(MAX_PAGE_SIZE);
  });

  it("falls back to the default for a nonsense perPage", () => {
    expect(parseCriteria({ perPage: "0" }).perPage).toBe(DEFAULT_PAGE_SIZE);
    expect(parseCriteria({ perPage: "abc" }).perPage).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("parseCriteria — boolean flags", () => {
  it("reads recent and favorites only from the literal 1", () => {
    expect(parseCriteria({ recent: "1" }).recent).toBe(true);
    expect(parseCriteria({ recent: "true" }).recent).toBe(false);
    expect(parseCriteria({ favorites: "1" }).favorites).toBe(true);
    expect(parseCriteria({ favorites: "0" }).favorites).toBe(false);
  });
});

describe("buildQueryString", () => {
  it("omits defaults, so the canonical catalog URL is bare", () => {
    expect(buildQueryString(parseCriteria({}))).toBe("");
  });

  it("round-trips through parseCriteria", () => {
    const original = parseCriteria({
      q: "blush",
      category: ["wedding"],
      color: ["blush", "ivory"],
      tier: "premium",
      sort: "newest",
      page: "2",
    });

    const reparsed = parseCriteria(toSearchParams(buildQueryString(original)));

    expect(reparsed.q).toBe(original.q);
    expect(reparsed.category).toEqual(original.category);
    expect(reparsed.color).toEqual(original.color);
    expect(reparsed.tier).toEqual(original.tier);
    expect(reparsed.sort).toBe(original.sort);
    expect(reparsed.page).toBe(original.page);
  });

  it("applies overrides", () => {
    const criteria = parseCriteria({ q: "blush" });
    expect(buildQueryString(criteria, { page: 3 })).toContain("page=3");
  });

  it("emits repeated params for multi-value filters", () => {
    const criteria = parseCriteria({ color: ["blush", "ivory"] });
    expect(buildQueryString(criteria)).toBe("?color=blush&color=ivory");
  });
});

describe("toggleFilter", () => {
  it("adds a value that is absent", () => {
    const next = toggleFilter(parseCriteria({}), "color", "blush");
    expect(next.color).toEqual(["blush"]);
  });

  it("removes a value that is present", () => {
    const next = toggleFilter(
      parseCriteria({ color: "blush" }),
      "color",
      "blush",
    );
    expect(next.color).toEqual([]);
  });

  it("resets to page 1, so narrowing cannot strand the user on an empty page", () => {
    const next = toggleFilter(parseCriteria({ page: "5" }), "color", "blush");
    expect(next.page).toBe(1);
  });

  it("does not mutate the input", () => {
    const criteria = parseCriteria({ color: "blush" });
    toggleFilter(criteria, "color", "ivory");
    expect(criteria.color).toEqual(["blush"]);
  });
});

describe("clearFilters", () => {
  it("drops every filter but keeps the sort", () => {
    const criteria = parseCriteria({
      q: "blush",
      category: "wedding",
      color: "ivory",
      recent: "1",
      favorites: "1",
      sort: "newest",
      page: "3",
    });

    const cleared = clearFilters(criteria);

    expect(isUnfiltered(cleared)).toBe(true);
    expect(cleared.page).toBe(1);
    expect(cleared.sort).toBe("newest");
  });
});

describe("isUnfiltered", () => {
  it("is true for a bare query", () => {
    expect(isUnfiltered(parseCriteria({}))).toBe(true);
  });

  it("is true when only the sort or page differ — neither narrows the catalog", () => {
    expect(isUnfiltered(parseCriteria({ sort: "newest", page: "2" }))).toBe(
      true,
    );
  });

  it("is false when anything narrows the catalog", () => {
    expect(isUnfiltered(parseCriteria({ q: "blush" }))).toBe(false);
    expect(isUnfiltered(parseCriteria({ category: "wedding" }))).toBe(false);
    expect(isUnfiltered(parseCriteria({ recent: "1" }))).toBe(false);
    expect(isUnfiltered(parseCriteria({ favorites: "1" }))).toBe(false);
  });
});

describe("activeFilterCount", () => {
  it("counts nothing for a bare query", () => {
    expect(activeFilterCount(parseCriteria({}))).toBe(0);
  });

  it("counts each selected value, plus each flag", () => {
    const criteria = parseCriteria({
      category: ["wedding", "debut"],
      color: "blush",
      recent: "1",
    });
    expect(activeFilterCount(criteria)).toBe(4);
  });

  it("does not count the free-text search, which has its own visible input", () => {
    expect(activeFilterCount(parseCriteria({ q: "blush" }))).toBe(0);
  });
});
