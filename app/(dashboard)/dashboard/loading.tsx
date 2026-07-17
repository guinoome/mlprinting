import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading state — Ph1.md §2 (Loading States).
 *
 * Shapes mirror the real page: a heading, then a card grid. A spinner would be
 * less work and would tell the user less — this way the layout does not jump
 * when the content lands.
 */
export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
