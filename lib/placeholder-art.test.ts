import { describe, expect, it } from "vitest";
import {
  placeholderCover,
  placeholderUrl,
  isPlaceholderSurface,
  PLACEHOLDER_SIZES,
} from "./placeholder-art";

const base = {
  seed: "rustic-garden",
  label: "Rustic Garden",
  width: 600,
  height: 750,
};

describe("placeholderCover", () => {
  it("is deterministic — same seed, same picture", () => {
    expect(placeholderCover(base)).toBe(placeholderCover(base));
  });

  it("gives different seeds different output", () => {
    expect(placeholderCover(base)).not.toBe(
      placeholderCover({ ...base, seed: "modern-ivory" }),
    );
  });

  it("renders the label and an initial glyph", () => {
    const svg = placeholderCover(base);
    expect(svg).toContain("Rustic Garden");
    expect(svg).toContain(">R<");
  });

  it("renders an optional caption in uppercase", () => {
    expect(placeholderCover({ ...base, caption: "Wedding" })).toContain(
      "WEDDING",
    );
  });

  it("omits the caption element entirely when absent", () => {
    const svg = placeholderCover(base);
    expect(svg).not.toContain("letter-spacing");
  });

  it("carries the requested dimensions", () => {
    const svg = placeholderCover({ ...base, width: 1280, height: 800 });
    expect(svg).toContain('viewBox="0 0 1280 800"');
  });

  it("escapes XML in the label — a template name is data, not markup", () => {
    const svg = placeholderCover({ ...base, label: 'Tom & "Jane" <script>' });

    expect(svg).toContain("Tom &amp; &quot;Jane&quot; &lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });

  it("escapes XML in the caption too", () => {
    const svg = placeholderCover({ ...base, caption: "A & B" });
    expect(svg).toContain("A &amp; B");
  });

  it("survives an empty label rather than emitting a broken glyph", () => {
    const svg = placeholderCover({ ...base, label: "" });
    expect(svg).toContain("·");
    expect(svg).toContain("<svg");
  });

  it("carries an accessible label", () => {
    expect(placeholderCover(base)).toContain('role="img"');
  });
});

describe("placeholderUrl", () => {
  it("builds a route-handler URL carrying the label", () => {
    const url = placeholderUrl("cover", "rustic-garden", "Rustic Garden");
    expect(url).toBe(
      "/api/placeholder/cover/rustic-garden?label=Rustic+Garden",
    );
  });

  it("includes the caption when given", () => {
    expect(placeholderUrl("cover", "a", "A", "Wedding")).toContain(
      "caption=Wedding",
    );
  });

  it("encodes a seed with URL-significant characters", () => {
    expect(placeholderUrl("cover", "a/b?c", "X")).toContain("a%2Fb%3Fc");
  });
});

describe("PLACEHOLDER_SIZES", () => {
  it("covers every surface Ph2 §6 requires", () => {
    expect(Object.keys(PLACEHOLDER_SIZES)).toEqual([
      "cover",
      "desktop",
      "mobile",
      "print",
    ]);
  });

  it("gives mobile a portrait aspect and desktop a landscape one", () => {
    expect(PLACEHOLDER_SIZES.mobile.height).toBeGreaterThan(
      PLACEHOLDER_SIZES.mobile.width,
    );
    expect(PLACEHOLDER_SIZES.desktop.width).toBeGreaterThan(
      PLACEHOLDER_SIZES.desktop.height,
    );
  });
});

describe("isPlaceholderSurface", () => {
  it("accepts known surfaces", () => {
    expect(isPlaceholderSurface("cover")).toBe(true);
    expect(isPlaceholderSurface("print")).toBe(true);
  });

  it("rejects anything else — this guards a route param", () => {
    expect(isPlaceholderSurface("../../etc/passwd")).toBe(false);
    expect(isPlaceholderSurface("")).toBe(false);
  });
});
