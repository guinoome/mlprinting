import { describe, expect, it } from "vitest";
import { parseOrderSearch, buildOrderSearchWhere } from "./search";

describe("parseOrderSearch", () => {
  it("defaults to no query and no status filter", () => {
    const c = parseOrderSearch({});
    expect(c.q).toBe("");
    expect(c.status).toEqual([]);
  });

  it("trims the query", () => {
    expect(parseOrderSearch({ q: "  ML-2026  " }).q).toBe("ML-2026");
  });

  it("keeps only valid statuses, from a comma list or repeated params", () => {
    expect(parseOrderSearch({ status: "CONFIRMED,BOGUS,COMPLETED" }).status).toEqual([
      "CONFIRMED",
      "COMPLETED",
    ]);
    expect(parseOrderSearch({ status: ["INQUIRY", "NOPE"] }).status).toEqual([
      "INQUIRY",
    ]);
  });

  it("drops duplicate statuses", () => {
    expect(parseOrderSearch({ status: "CONFIRMED,CONFIRMED" }).status).toEqual([
      "CONFIRMED",
    ]);
  });
});

describe("buildOrderSearchWhere", () => {
  it("is an empty object when nothing is filtered", () => {
    expect(buildOrderSearchWhere({ q: "", status: [] })).toEqual({});
  });

  it("searches reference and customer for a query", () => {
    const where = buildOrderSearchWhere({ q: "ana", status: [] });
    expect(where.OR).toBeDefined();
    // reference OR the customer's name OR email — all case-insensitive contains.
    const asString = JSON.stringify(where);
    expect(asString).toContain("reference");
    expect(asString).toContain("profile");
    expect(asString.toLowerCase()).toContain("insensitive");
  });

  it("filters by the chosen statuses", () => {
    const where = buildOrderSearchWhere({ q: "", status: ["CONFIRMED", "COMPLETED"] });
    expect(where.status).toEqual({ in: ["CONFIRMED", "COMPLETED"] });
  });

  it("combines a query and a status filter", () => {
    const where = buildOrderSearchWhere({ q: "ana", status: ["CONFIRMED"] });
    expect(where.OR).toBeDefined();
    expect(where.status).toEqual({ in: ["CONFIRMED"] });
  });
});
