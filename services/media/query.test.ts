import { describe, expect, it } from "vitest";
import { parseMediaCriteria } from "./criteria";
import { buildMediaWhere, buildMediaOrderBy, buildMediaPagination } from "./query";

describe("buildMediaWhere", () => {
  it("always scopes to the caller's profile", () => {
    const where = buildMediaWhere(parseMediaCriteria({}), { profileId: "user-1" });
    expect(where.AND).toContainEqual({ profileId: "user-1" });
  });

  it("adds a kind filter mapped to the Prisma enum", () => {
    const where = buildMediaWhere(parseMediaCriteria({ kind: "image,document" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ kind: { in: ["IMAGE", "DOCUMENT"] } });
  });

  it("adds a hasSome tag filter", () => {
    const where = buildMediaWhere(parseMediaCriteria({ tag: "logo" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ tags: { hasSome: ["logo"] } });
  });

  it("filters to assets with zero usages for the 'unsorted' event value", () => {
    const where = buildMediaWhere(parseMediaCriteria({ event: "unsorted" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ usages: { none: {} } });
  });

  it("filters to one invitation's usages for a real event id", () => {
    const where = buildMediaWhere(parseMediaCriteria({ event: "inv-1" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({
      usages: { some: { invitationId: "inv-1" } },
    });
  });

  it("searches filename, alt text, and tags for a free-text query", () => {
    const where = buildMediaWhere(parseMediaCriteria({ q: "beach" }), {
      profileId: "user-1",
    });
    const clause = where.AND?.find((c: any) => c.AND) as any;
    expect(clause.AND[0].OR).toEqual([
      { originalFilename: { contains: "beach", mode: "insensitive" } },
      { altText: { contains: "beach", mode: "insensitive" } },
      { tags: { has: "beach" } },
    ]);
  });
});

describe("buildMediaOrderBy", () => {
  it("orders newest first by default, with a unique tiebreaker", () => {
    expect(buildMediaOrderBy("newest")).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("orders by size for 'largest'", () => {
    expect(buildMediaOrderBy("largest")).toEqual([
      { bytes: "desc" },
      { id: "asc" },
    ]);
  });

  it("orders alphabetically for 'name'", () => {
    expect(buildMediaOrderBy("name")).toEqual([
      { originalFilename: "asc" },
      { id: "asc" },
    ]);
  });
});

describe("buildMediaPagination", () => {
  it("computes skip/take from page and perPage", () => {
    const criteria = parseMediaCriteria({ page: "3", perPage: "20" });
    expect(buildMediaPagination(criteria)).toEqual({ skip: 40, take: 20 });
  });
});
