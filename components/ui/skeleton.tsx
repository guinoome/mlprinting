import { cn } from "@/lib/utils";

/**
 * Loading placeholder — Ph1.md §2 (Loading States).
 * Mirror the shape of the content it stands in for, or the page jumps on load.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
