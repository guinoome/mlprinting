import Link from "next/link";
import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/config";
import { buildQueryString, SORTS, type Criteria, type Sort } from "../criteria";

/** Ph2.md §5. */
const SORT_LABELS: Record<Sort, string> = {
  recommended: "Recommended",
  popular: "Most popular",
  newest: "Newest",
  alphabetical: "Alphabetical",
};

/**
 * Sort menu — Ph2.md §5.
 *
 * Items are links, for the same reason the filters are: each sort is a URL, so
 * a sorted view is shareable and the back button works. Changing sort resets to
 * page 1 — page 3 of "newest" has no relationship to page 3 of "popular".
 */
export function SortMenu({ criteria }: { criteria: Criteria }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown aria-hidden="true" />
          <span className="hidden sm:inline">{SORT_LABELS[criteria.sort]}</span>
          <span className="sm:hidden">Sort</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {SORTS.map((sort) => (
          <DropdownMenuItem key={sort} asChild>
            <Link
              href={`${routes.templates}${buildQueryString(criteria, { sort, page: 1 })}`}
              scroll={false}
            >
              <span
                className="flex size-4 items-center justify-center"
                aria-hidden="true"
              >
                {criteria.sort === sort ? <Check className="size-3.5" /> : null}
              </span>
              {SORT_LABELS[sort]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
