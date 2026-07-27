import { describe, expect, it } from "vitest";
import { shouldNavigateSearch } from "./search-sync";

describe("shouldNavigateSearch", () => {
  it("navigates once the typed query differs from the URL", () => {
    expect(shouldNavigateSearch("rustic", null)).toBe(true);
    expect(shouldNavigateSearch("rustic", "floral")).toBe(true);
  });

  it("navigates when the box is cleared but the URL still carries a query", () => {
    expect(shouldNavigateSearch("", "floral")).toBe(true);
  });

  /**
   * The regression. Clicking page two re-runs the debounce effect, because the
   * navigate callback closes over searchParams and so changes identity on every
   * navigation. The old guard skipped only the first render, so this re-run
   * scheduled a navigation that deleted `page` — and the catalogue bounced back
   * to page one about a third of a second after the click, for every page
   * number, silently.
   *
   * Paging does not touch `q`, so box and URL still agree, and agreeing must
   * mean "do nothing".
   */
  it("stays put when only the page changed", () => {
    expect(shouldNavigateSearch("floral", "floral")).toBe(false);
    expect(shouldNavigateSearch("", null)).toBe(false);
  });

  it("ignores whitespace the user has not committed to", () => {
    // Typing a trailing space would otherwise navigate to the same results.
    expect(shouldNavigateSearch("floral ", "floral")).toBe(false);
    expect(shouldNavigateSearch("  ", null)).toBe(false);
  });
});
