import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Crumb } from "@/components/ui/breadcrumbs";

/**
 * A dashboard section that exists but does nothing yet — Ph1.md §6
 * ("Create placeholders for…", "Business logic comes later").
 *
 * Names the phase that fills it in. A placeholder that just says "coming soon"
 * teaches a staff member nothing and teaches a developer less; naming the phase
 * makes the roadmap legible from inside the product, and makes it obvious when
 * one of these has outlived its phase and should have been replaced.
 */
export function PlaceholderModule({
  title,
  description,
  icon: Icon,
  phase,
  breadcrumbs,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: number;
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
        title={`${title} arrives in Phase ${phase}`}
        description={`This section is part of the Phase 1 framework. Its functionality lands in Phase ${phase} — until then there is deliberately nothing here.`}
      />
    </>
  );
}
