import { Skeleton } from "@/components/ui/skeleton";

/**
 * Catalog loading state — Ph2.md §10.
 * Mirrors the catalog's shape (sidebar, toolbar, card grid) so the layout does
 * not jump when results land.
 *
 * Lives in the (catalog) route group, and that placement is load-bearing.
 * A loading.tsx wraps its entire subtree in a Suspense boundary — one directory
 * up, at app/templates/, it would also cover /templates/[slug]. Next flushes
 * this shell with a 200 before the page runs, so the preview page's notFound()
 * could no longer set the status: a missing template would render "Page not
 * found" under a 200, telling crawlers the page exists.
 *
 * Verified both ways: with this file at app/templates/, /templates/does-not-exist
 * returns 200. Here, it returns 404.
 */
export default function TemplatesLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex gap-8">
        <div className="hidden w-56 shrink-0 space-y-6 lg:block">
          {Array.from({ length: 4 }).map((_, group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              {Array.from({ length: 4 }).map((_, item) => (
                <Skeleton key={item} className="h-7 w-full" />
              ))}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <Skeleton className="mb-3 h-10 w-full" />
          <Skeleton className="mb-6 h-5 w-28" />

          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-[4/5] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
