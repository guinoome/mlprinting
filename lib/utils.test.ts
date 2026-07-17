import { describe, it, expect } from "vitest";
import { cn, initialsFrom, formatBytes } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("initialsFrom", () => {
  it("takes the first and last word", () => {
    expect(initialsFrom("Maria Santos")).toBe("MS");
    expect(initialsFrom("Maria Luisa Santos")).toBe("MS");
  });

  it("falls back to one letter for a single word", () => {
    expect(initialsFrom("Maria")).toBe("M");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initialsFrom("  Maria   Santos  ")).toBe("MS");
  });

  it("uppercases", () => {
    expect(initialsFrom("maria santos")).toBe("MS");
  });

  it("returns a placeholder rather than an empty avatar", () => {
    expect(initialsFrom("")).toBe("?");
    expect(initialsFrom("   ")).toBe("?");
  });

  it("handles an email, which is the fallback when no name is set", () => {
    expect(initialsFrom("maria@example.com")).toBe("M");
  });
});

describe("formatBytes", () => {
  it("formats zero and raw bytes without decimals", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("steps up through binary units", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe("5.0 GB");
  });

  it("returns a dash for nonsense rather than NaN", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(NaN)).toBe("—");
  });
});
