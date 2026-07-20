import { describe, expect, it } from "vitest";
import { wrapText, fitsInBox } from "./text";

/** Deterministic stand-in for a font: every glyph is 10 units wide at size 1. */
const measure = (text: string, size: number) => text.length * size * 10;

describe("wrapText", () => {
  it("keeps a short line intact", () => {
    expect(wrapText("Ana and Ben", 2000, 1, measure)).toEqual(["Ana and Ben"]);
  });

  it("breaks on word boundaries, never mid-word", () => {
    const lines = wrapText("Ana and Ben", 60, 1, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line).not.toMatch(/^\s|\s$/);
    expect(lines.join(" ")).toBe("Ana and Ben");
  });

  it("puts a word longer than the line on its own line rather than looping forever", () => {
    const lines = wrapText("supercalifragilistic", 50, 1, measure);
    expect(lines).toEqual(["supercalifragilistic"]);
  });

  it("preserves explicit newlines as hard breaks", () => {
    expect(wrapText("one\ntwo", 2000, 1, measure)).toEqual(["one", "two"]);
  });

  it("returns an empty array for empty input", () => {
    expect(wrapText("   ", 100, 1, measure)).toEqual([]);
  });
});

describe("fitsInBox", () => {
  it("passes when the wrapped text is shorter than the box", () => {
    const r = fitsInBox(
      "Ana and Ben",
      { width: 2000, height: 100 },
      1,
      1.4,
      measure,
    );
    expect(r.fits).toBe(true);
    expect(r.lines).toEqual(["Ana and Ben"]);
  });

  it("fails when wrapped lines exceed the box height", () => {
    const r = fitsInBox(
      "Ana and Ben and everyone else",
      { width: 40, height: 2 },
      1,
      1.4,
      measure,
    );
    expect(r.fits).toBe(false);
    expect(r.requiredHeight).toBeGreaterThan(2);
  });
});
