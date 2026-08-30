import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Download, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  getInvitationForManage,
  getRsvpSummary,
  listRsvps,
} from "@/features/website-generator/repository";
import { parseRsvpCriteria } from "@/features/website-generator/rsvp-intelligence";

export const metadata: Metadata = { title: "RSVPs" };

export const dynamic = "force-dynamic";

/**
 * RSVP list — Ph5.md §3. The first "manage a completed invitation" surface
 * in this project; Phase 3's "My Events" only ever reopens a draft into the
 * builder.
 */
export default async function EventRsvpsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { q?: string | string[]; status?: string | string[] };
}) {
  if (!features.websiteGenerator) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) notFound();

  const criteria = parseRsvpCriteria(searchParams);
  const [rsvps, summary] = await Promise.all([
    listRsvps(profile.id, params.id, criteria),
    getRsvpSummary(profile.id, params.id),
  ]);

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
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Responses", summary.responseCount],
          ["Attending", `${summary.attendingGuests} guests`],
          ["Declined", summary.declinedResponses],
          ["Pending", summary.pendingGuests ?? "Not tracked"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Search guest or message
            </span>
            <input
              name="q"
              type="search"
              defaultValue={criteria.query}
              className="h-10 w-full rounded-md border bg-background px-3"
              placeholder="Search RSVPs"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Status
            </span>
            <select
              name="status"
              defaultValue={criteria.status}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="all">All responses</option>
              <option value="attending">Attending</option>
              <option value="declined">Declined</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background"
          >
            <Search className="size-4" aria-hidden="true" /> Filter
          </button>
        </form>
        <Link
          href={`/api/events/${params.id}/rsvps/export`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium"
        >
          <Download className="size-4" aria-hidden="true" /> Export CSV
        </Link>
      </div>
      {summary.pendingGuests === null ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Pending requires a guest manifest. This invitation currently collects
          open responses, so the system will not invent a pending count.
        </p>
      ) : null}

      {rsvps.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={
            summary.responseCount === 0
              ? "No responses yet"
              : "No matching responses"
          }
          description={
            summary.responseCount === 0
              ? "Responses show up here once your website is published and guests start replying."
              : "Try a different guest name or status filter."
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {rsvps.length} response{rsvps.length === 1 ? "" : "s"}.
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
