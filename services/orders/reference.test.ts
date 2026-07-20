import { describe, expect, it } from "vitest";
import { formatReference, parseReference, nextReference } from "./reference";

describe("formatReference", () => {
  it("pads the sequence to four digits", () => {
    expect(formatReference(2026, 42)).toBe("ML-2026-0042");
    expect(formatReference(2026, 1)).toBe("ML-2026-0001");
  });

  it("does not truncate a sequence past four digits", () => {
    expect(formatReference(2026, 12345)).toBe("ML-2026-12345");
  });
});

describe("parseReference", () => {
  it("reads back a formatted reference", () => {
    expect(parseReference("ML-2026-0042")).toEqual({ year: 2026, sequence: 42 });
  });

  it("returns null for anything that is not one", () => {
    expect(parseReference("")).toBeNull();
    expect(parseReference("2026-0042")).toBeNull();
    expect(parseReference("ML-2026")).toBeNull();
    expect(parseReference("ML-abcd-0042")).toBeNull();
  });
});

describe("nextReference", () => {
  it("starts at one when the year has no orders yet", () => {
    expect(nextReference(2026, null)).toBe("ML-2026-0001");
  });

  it("increments from the highest existing reference", () => {
    expect(nextReference(2026, "ML-2026-0042")).toBe("ML-2026-0043");
  });

  it("restarts the sequence in a new year", () => {
    expect(nextReference(2027, "ML-2026-0900")).toBe("ML-2027-0001");
  });

  it("ignores an unparseable existing reference rather than crashing", () => {
    expect(nextReference(2026, "garbage")).toBe("ML-2026-0001");
  });
});
