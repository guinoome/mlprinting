import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("always includes the first and last page", () => {
    const window = pageWindow(10, 20);
    expect(window[0]).toBe(1);
    expect(window.at(-1)).toBe(20);
  });

  it("includes the current page and its neighbours", () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it("marks gaps with null rather than fabricating pages", () => {
    expect(pageWindow(10, 20).filter((p) => p === null)).toHaveLength(2);
  });

  it("does not gap when the current page is near the start", () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, null, 20]);
  });

  it("does not gap when the current page is near the end", () => {
    expect(pageWindow(19, 20)).toEqual([1, null, 18, 19, 20]);
  });

  it("never repeats a page", () => {
    for (const current of [1, 2, 10, 19, 20]) {
      const pages = pageWindow(current, 20).filter(
        (p): p is number => p !== null,
      );
      expect(new Set(pages).size).toBe(pages.length);
    }
  });

  it("stays ascending", () => {
    const pages = pageWindow(10, 20).filter((p): p is number => p !== null);
    expect(pages).toEqual([...pages].sort((a, b) => a - b));
  });

  it("handles a single page", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
