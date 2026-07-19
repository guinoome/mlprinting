import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  getInvitationForManage,
  listRsvps,
} from "@/features/website-generator/repository";

export const metadata: Metadata = { title: "RSVPs" };

export const dynamic = "force-dynamic";

/**
 * RSVP list — Ph5.md §3. The first "manage a completed invitation" surface
 * in this project; Phase 3's "My Events" only ever reopens a draft into the
 * builder.
 */
export default async function EventRsvpsPage({
  params,
}: {
  params: { id: string };
}) {
  if (!features.websiteGenerator) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) notFound();

  const rsvps = await listRsvps(profile.id, params.id);
  const attendingCount = rsvps
    .filter((rsvp) => rsvp.attending)
    .reduce((sum, rsvp) => sum + rsvp.guestCount, 0);

  return (
    <>
      <PageHeader
        title="RSVPs"
        description={`Responses for "${invitation.title}".`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "RSVPs" },
        ]}
      />

      {rsvps.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No responses yet"
          description="Responses show up here once your website is published and guests start replying."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {attendingCount} guest{attendingCount === 1 ? "" : "s"} attending,
            across {rsvps.length} response{rsvps.length === 1 ? "" : "s"}.
          </p>
          <div className="space-y-2">
            {rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{rsvp.guestName}</p>
                  <span
                    className={
                      rsvp.attending
                        ? "text-xs text-success"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {rsvp.attending
                      ? `Attending · ${rsvp.guestCount}`
                      : "Not attending"}
                  </span>
                </div>
                {rsvp.message ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rsvp.message}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {rsvp.createdAt.toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
