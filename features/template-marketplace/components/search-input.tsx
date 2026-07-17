"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

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

  // Debounced: one navigation per pause, not one per keystroke. Skips the first
  // run so mounting the component does not immediately re-navigate to the URL
  // that mounted it.
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const timer = setTimeout(() => navigate(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, navigate]);

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
