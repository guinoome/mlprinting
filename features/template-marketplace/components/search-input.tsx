"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shouldNavigateSearch } from "../search-sync";

/**
 * Free-text search — Ph2.md §3.
 *
 * A real <form> with a GET method underneath: pressing Enter navigates and the
 * search works with JavaScript disabled. The debounced live update on top is an
 * enhancement, not the mechanism.
 */
const DEBOUNCE_MS = 300;

export function SearchInput({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(initialQuery ?? "");

  /** Navigate to this query, preserving filters but resetting to page 1. */
  const navigate = React.useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      // A new search on page 3 would otherwise land on a page that may not exist.
      params.delete("page");

      const queryString = params.toString();
      router.replace(queryString ? `?${queryString}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  /**
   * Debounced: one navigation per pause, not one per keystroke.
   *
   * The condition is that the box and the URL disagree — not merely that this
   * effect ran. Skipping only the first render was not enough: `navigate`
   * closes over `searchParams`, so every navigation handed it a new identity
   * and re-ran this effect. Clicking page two therefore scheduled a navigation
   * that deleted `page` and replaced the URL, and the catalogue bounced back to
   * page one a third of a second after the click, for any page number, with no
   * error to show for it.
   *
   * Comparing against the URL also retires the mounted ref: on the render that
   * mounts the component, the two already agree.
   */
  React.useEffect(() => {
    if (!shouldNavigateSearch(value, searchParams.get("q"))) return;

    const timer = setTimeout(() => navigate(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, navigate, searchParams]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(value);
      }}
      className="relative"
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search templates…"
        aria-label="Search templates"
        className="pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </form>
  );
}
