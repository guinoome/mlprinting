import { describe, expect, it } from "vitest";
import { printColours } from "./colour";

describe("printColours", () => {
  it("returns the authored CMYK for a known theme", () => {
    const c = printColours("classic-ivory");
    expect(c.background).toEqual([0, 0.02, 0.05, 0.04]);
    expect(c.accent).toEqual([0, 0.19, 0.81, 0.21]);
  });

  it("keeps neutral dark text K-only, so small type does not misregister", () => {
    expect(printColours("classic-ivory").foreground).toEqual([0, 0, 0, 0.78]);
    expect(printColours("monochrome").foreground).toEqual([0, 0, 0, 1]);
  });

  it("falls back to the default theme rather than throwing on a retired slug", () => {
    const c = printColours("no-such-theme");
    expect(c.background).toHaveLength(4);
    expect(c.foreground).toHaveLength(4);
  });

  it("keeps every component within 0-1", () => {
    for (const slug of [
      "classic-ivory",
      "blush-rose",
      "sage-garden",
      "midnight-navy",
      "burgundy-velvet",
      "coral-fiesta",
      "monochrome",
    ]) {
      const c = printColours(slug);
      for (const tuple of [c.background, c.foreground, c.accent]) {
        for (const v of tuple) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
