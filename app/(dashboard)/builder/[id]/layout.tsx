import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile, isAuthConfigured } from "@/lib/auth/session";
import { ConfigurationRequired } from "@/components/configuration-required";
import { routes, features } from "@/lib/config";
import { getDraft, snapshotOf } from "@/features/invitation-builder/repository";
import {
  incompleteSteps,
  completionPercent,
} from "@/features/invitation-builder/completeness";
import { StepNav } from "@/features/invitation-builder/components/step-nav";
import { DraftTitle } from "@/features/invitation-builder/components/draft-title";

/**
 * Builder shell — Ph3.md §1.
 *
 * Loads the draft once and gives every step its nav, progress, and title. The
 * step pages re-read it through the cached `getDraft`, so this costs one query.
 */
export const dynamic = "force-dynamic";

export default async function BuilderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  if (!isAuthConfigured()) return <ConfigurationRequired />;
  if (!features.invitationBuilder) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  // Scoped to the owner inside the query. Someone else's draft is not a 403
  // here, it is a 404 — confirming an id exists is itself a leak.
  const draft = await getDraft(profile.id, params.id);
  if (!draft) notFound();

  const snapshot = snapshotOf(draft);
  const percent = completionPercent(snapshot);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={routes.dashboard.events}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to my events"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <DraftTitle invitationId={draft.id} title={draft.title} />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Required steps complete"
            >
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <StepNav
              invitationId={draft.id}
              currentStep={draft.currentStep}
              incompleteSteps={[...incompleteSteps(snapshot)]}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
