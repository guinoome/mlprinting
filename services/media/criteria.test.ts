import { describe, expect, it } from "vitest";
import { parseMediaCriteria, DEFAULT_MEDIA_SORT, DEFAULT_MEDIA_PAGE_SIZE, MAX_MEDIA_PAGE_SIZE } from "./criteria";

describe("parseMediaCriteria", () => {
  it("defaults to no filters, newest sort, page 1", () => {
    const criteria = parseMediaCriteria({});
    expect(criteria.q).toBeUndefined();
    expect(criteria.kind).toEqual([]);
    expect(criteria.tag).toEqual([]);
    expect(criteria.event).toBeUndefined();
    expect(criteria.sort).toBe(DEFAULT_MEDIA_SORT);
    expect(criteria.page).toBe(1);
    expect(criteria.perPage).toBe(DEFAULT_MEDIA_PAGE_SIZE);
  });

  it("normalises repeated kind params into a deduped lowercase array", () => {
    const criteria = parseMediaCriteria({ kind: ["IMAGE", "image", "document"] });
    expect(criteria.kind).toEqual(["image", "document"]);
  });

  it("drops an unknown kind rather than erroring", () => {
    const criteria = parseMediaCriteria({ kind: "video,sculpture" });
    expect(criteria.kind).toEqual(["video"]);
  });

  it("falls back to a valid default for a bad page number", () => {
    expect(parseMediaCriteria({ page: "-3" }).page).toBe(1);
    expect(parseMediaCriteria({ page: "banana" }).page).toBe(1);
  });

  it("clamps perPage to the maximum", () => {
    expect(parseMediaCriteria({ perPage: "100000" }).perPage).toBe(MAX_MEDIA_PAGE_SIZE);
  });

  it("falls back to the default sort for an unrecognised value", () => {
    expect(parseMediaCriteria({ sort: "biggest-first" }).sort).toBe(DEFAULT_MEDIA_SORT);
  });

  it("passes through a recognised sort", () => {
    expect(parseMediaCriteria({ sort: "largest" }).sort).toBe("largest");
  });

  it("passes through a single event filter", () => {
    expect(parseMediaCriteria({ event: "inv-1" }).event).toBe("inv-1");
  });

  it("trims and length-caps a free-text query", () => {
    const long = "a".repeat(500);
    expect(parseMediaCriteria({ q: `  ${long}  ` }).q).toHaveLength(100);
  });
});
