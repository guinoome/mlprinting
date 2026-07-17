import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import { buildQueryString, type Criteria } from "../criteria";

/**
 * Pagination — Ph2.md §10 ("Support pagination or infinite scrolling").
 *
 * Pagination, not infinite scroll. A catalog is something people compare
 * against, leave, and come back to: pages are linkable, the footer is reachable,
 * and "page 3 of 4" tells you how much you have left. Infinite scroll trades all
 * of that for a smoother thumb, which is the wrong trade when the goal is
 * choosing one template with confidence (Ph2.md UI Requirements).
 */

/** Page numbers to show, with nulls marking gaps. Always shows first, last, and neighbours. */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const output: (number | null)[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) output.push(null);
    output.push(sorted[i]!);
  }
  return output;
}

export function Pagination({
  criteria,
  totalPages,
}: {
  criteria: Criteria;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const href = (page: number) =>
    `${routes.templates}${buildQueryString(criteria, { page })}`;
  const current = Math.min(criteria.page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-1"
    >
      {current > 1 ? (
        <Link
          href={href(current - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ChevronLeft />
        </Link>
      ) : (
        // Rendered as a disabled span rather than omitted: removing it would
        // shift every other control sideways between pages.
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft />
        </span>
      )}

      {pageWindow(current, totalPages).map((page, index) =>
        page === null ? (
          <span
            key={`gap-${index}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-label={`Page ${page}`}
            aria-current={page === current ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: page === current ? "default" : "ghost",
                size: "icon",
              }),
              "text-sm",
            )}
          >
            {page}
          </Link>
        ),
      )}

      {current < totalPages ? (
        <Link
          href={href(current + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ChevronRight />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "pointer-events-none opacity-40",
          )}
        >
          <ChevronRight />
        </span>
      )}
    </nav>
  );
}
