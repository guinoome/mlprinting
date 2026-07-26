import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { customerNav } from "@/lib/config/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  getDashboardOverview,
  daysUntil,
  countdownLabel,
} from "@/features/dashboard/overview";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * The customer's landing view.
 *
 * Shows their situation — the next event, what has come back from guests —
 * rather than a menu of the sections they could visit. The sections are still
 * reachable, but as a quiet list underneath: a person opening this page wants
 * to know how many guests have replied, not to be handed a site map.
 *
 * Nothing here mentions a phase number. That was internal scheduling language
 * on a customer's screen, and it was also out of date.
 */
export default async function DashboardPage() {
  const profile = await getProfile();
  const firstName = profile?.displayName?.trim().split(/\s+/)[0];
  const overview = profile
    ? await getDashboardOverview(profile.id)
    : null;

  const hasEvents = (overview?.eventCount ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={
          hasEvents
            ? "Your events, replies, and orders."
            : "Start with a template and your invitation takes shape from there."
        }
      />

      {hasEvents ? (
        <>
          {overview?.nextEvent ? (
            <NextEventCard event={overview.nextEvent} />
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Events" value={overview!.eventCount} />
            <Stat label="Published" value={overview!.publishedCount} />
            <Stat label="RSVPs" value={overview!.rsvpCount} />
            <Stat label="Orders" value={overview!.orderCount} />
          </div>
        </>
      ) : (
        <StartHere />
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Everything else</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customerNav.map(({ label, href, icon: Icon, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {label}
                  <ArrowRight
                    className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/** A single number and its label. Deliberately plain — four of these in a row. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-serif text-3xl leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/**
 * The next event, with the two numbers that matter as it approaches: how long
 * is left, and how many people have said yes.
 */
function NextEventCard({
  event,
}: {
  event: NonNullable<
    Awaited<ReturnType<typeof getDashboardOverview>>["nextEvent"]
  >;
}) {
  const days = daysUntil(event.eventDate);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Next event
          </p>
          <h2 className="mt-2 truncate font-serif text-2xl">{event.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.eventDate.toLocaleDateString("en-PH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {countdownLabel(days)}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div>
            <p className="font-serif text-3xl leading-none tabular-nums">
              {event.attendingCount}
            </p>
            <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              Attending
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl leading-none tabular-nums">
              {event.rsvpCount}
            </p>
            <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              Replies
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button asChild variant="outline" size="sm">
            <Link href={routes.dashboard.eventRsvps(event.id)}>
              View replies
            </Link>
          </Button>
          {event.isPublished && event.slug ? (
            <Button asChild variant="outline" size="sm">
              <Link
                href={routes.publicEvent(event.slug)}
                target="_blank"
                rel="noreferrer"
              >
                Open invitation
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={routes.dashboard.eventWebsite(event.id)}>
                Publish it
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** First run: one clear thing to do, not an empty grid of zeroes. */
function StartHere() {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-8">
        <div className="max-w-md">
          <Sparkles className="size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-2xl">
            Let&rsquo;s make your first invitation.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pick a design you like and we will walk you through the details —
            hosts, venue, photos, and the wording. You can stop and come back at
            any point.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {features.templateMarketplace ? (
            <Button asChild>
              <Link href={routes.templates}>
                Browse templates
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          {features.invitationBuilder ? (
            <Button asChild variant="outline">
              <Link href={routes.builderNew}>
                <Plus aria-hidden="true" />
                Start from scratch
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
