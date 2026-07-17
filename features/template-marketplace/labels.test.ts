import { describe, expect, it } from "vitest";
import { facetLabel } from "./labels";

describe("facetLabel", () => {
  it("uppercases known acronyms, which CSS capitalize gets wrong", () => {
    expect(facetLabel("rsvp")).toBe("RSVP");
    expect(facetLabel("qr")).toBe("QR");
    expect(facetLabel("pdf")).toBe("PDF");
  });

  it("capitalises an ordinary slug", () => {
    expect(facetLabel("gallery")).toBe("Gallery");
    expect(facetLabel("blush")).toBe("Blush");
  });

  it("uses sentence case for multi-word slugs, not title case", () => {
    expect(facetLabel("save-the-date")).toBe("Save the date");
  });

  it("catches an acronym inside a multi-word slug", () => {
    expect(facetLabel("rsvp-tracking")).toBe("RSVP tracking");
  });

  it("is case-insensitive about the input", () => {
    expect(facetLabel("RSVP")).toBe("RSVP");
    expect(facetLabel("Rsvp")).toBe("RSVP");
  });

  it("survives an empty slug", () => {
    expect(facetLabel("")).toBe("");
  });

  it("handles underscores and stray whitespace", () => {
    expect(facetLabel("map_view")).toBe("Map view");
    expect(facetLabel("  gallery  ")).toBe("Gallery");
  });
});
