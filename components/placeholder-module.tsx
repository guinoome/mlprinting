import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Crumb } from "@/components/ui/breadcrumbs";

/**
 * A section that exists in the navigation but has no functionality yet.
 *
 * Says plainly that it is not built and what it will do, rather than "coming
 * soon" — which tells a staff member nothing about whether to wait or to go
 * and do the job somewhere else.
 *
 * It deliberately no longer announces a phase number on screen. Phase numbers
 * are internal scheduling, they mean nothing to the person reading, and they
 * go stale: this component was still calling shipped sections "Phase 1
 * framework" long after those phases landed. The `phase` prop is kept because
 * the navigation registry tracks it, and because a value that stops being
 * rendered is one a developer can still grep for.
 */
export function PlaceholderModule({
  title,
  description,
  icon: Icon,
  breadcrumbs,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Accepted and recorded by the navigation registry; not shown to anyone. */
  phase?: number;
  breadcrumbs?: Crumb[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <EmptyState
        icon={<Icon />}
        title={`${title} is not built yet`}
        description={`${description} It is planned, and this section is where it will live — there is deliberately nothing here until then.`}
      />
    </>
  );
}
