import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PlaceholderModule } from "@/components/placeholder-module";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  listDrafts,
  snapshotOfListRow,
} from "@/features/invitation-builder/repository";
import { DraftCard } from "@/features/invitation-builder/components/draft-card";

export const metadata: Metadata = {
  title: "My Events",
};

export const dynamic = "force-dynamic";

/**
 * My Events — Ph1.md §6 placeholder, filled in by Ph3.md §11 (Draft Management).
 *
 * The flag check is not ceremony: with the builder off, this must go back to
 * being an honest placeholder rather than list drafts nobody can open.
 */
export default async function EventsPage() {
  if (!features.invitationBuilder) {
    return (
      <PlaceholderModule
        title="My Events"
        description="Events you are planning, and their invitations."
        icon={CalendarDays}
        phase={3}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events" },
        ]}
      />
    );
  }

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const drafts = await listDrafts(profile.id);

  return (
    <>
      <PageHeader
        title="My Events"
        description="Your invitations, finished and in progress."
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events" },
        ]}
        actions={
          drafts.length > 0 ? (
            <Button asChild>
              <Link href={routes.builderNew}>
                <Plus aria-hidden="true" />
                New invitation
              </Link>
            </Button>
          ) : null
        }
      />

      {drafts.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No invitations yet"
          description="Start from a template, or create a blank invitation and choose a design as you go."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href={routes.templates}>Browse templates</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={routes.builderNew}>Start blank</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              snapshot={snapshotOfListRow(draft)}
            />
          ))}
        </div>
      )}
    </>
  );
}
