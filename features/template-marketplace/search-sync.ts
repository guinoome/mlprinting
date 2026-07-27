/**
 * When the debounced search box should navigate.
 *
 * Extracted from SearchInput so the rule can be tested without a DOM. The
 * component's effect re-runs for reasons that have nothing to do with typing —
 * notably every page change, because its navigate callback closes over
 * searchParams — so "did this effect run" is the wrong question. The right one
 * is whether the box and the URL disagree.
 */
export function shouldNavigateSearch(value: string, queryInUrl: string | null): boolean {
  return value.trim() !== (queryInUrl ?? "").trim();
}
