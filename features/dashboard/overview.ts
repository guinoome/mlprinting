import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * The customer dashboard's own read.
 *
 * One module, one query set: the landing view of the dashboard needs a few
 * totals and the next event, and asking each feature's repository for its own
 * slice would mean five round trips to render one screen.
 *
 * Degrades to zeroes rather than throwing. A dashboard that fails to load
 * because a count query hiccuped is worse than one that briefly says nothing is
 * happening.
 */

export interface NextEvent {
  id: string;
  title: string;
  eventDate: Date;
  slug: string | null;
  isPublished: boolean;
  rsvpCount: number;
  attendingCount: number;
}

export interface DashboardOverview {
  eventCount: number;
  publishedCount: number;
  rsvpCount: number;
  orderCount: number;
  nextEvent: NextEvent | null;
}

const EMPTY: DashboardOverview = {
  eventCount: 0,
  publishedCount: 0,
  rsvpCount: 0,
  orderCount: 0,
  nextEvent: null,
};

export async function getDashboardOverview(
  profileId: string,
): Promise<DashboardOverview> {
  if (!isDatabaseConfigured()) return EMPTY;

  try {
    // Midnight today, not now: an event happening this afternoon is still
    // upcoming, and a countdown that drops it at noon is wrong.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [eventCount, publishedCount, rsvpCount, orderCount, upcoming] =
      await Promise.all([
        prisma.invitation.count({ where: { profileId } }),
        prisma.invitation.count({ where: { profileId, isPublished: true } }),
        // Scoped through the invitation's owner: an RSVP row has no profileId
        // of its own, so ownership is proven by the join, not by a column.
        prisma.rsvpResponse.count({ where: { invitation: { profileId } } }),
        prisma.order.count({ where: { profileId } }),
        prisma.invitation.findFirst({
          where: { profileId, eventDate: { gte: today } },
          orderBy: { eventDate: "asc" },
          select: {
            id: true,
            title: true,
            eventTitle: true,
            eventDate: true,
            slug: true,
            isPublished: true,
            _count: { select: { rsvps: true } },
          },
        }),
      ]);

    let nextEvent: NextEvent | null = null;
    if (upcoming?.eventDate) {
      const attendingCount = await prisma.rsvpResponse.count({
        where: { invitationId: upcoming.id, attending: true },
      });
      nextEvent = {
        id: upcoming.id,
        title: upcoming.eventTitle?.trim() || upcoming.title,
        eventDate: upcoming.eventDate,
        slug: upcoming.slug,
        isPublished: upcoming.isPublished,
        rsvpCount: upcoming._count.rsvps,
        attendingCount,
      };
    }

    return { eventCount, publishedCount, rsvpCount, orderCount, nextEvent };
  } catch (error) {
    logger.report(error, { at: "getDashboardOverview", profileId });
    return EMPTY;
  }
}

/**
 * Whole days from today until the event, in the viewer's own day boundaries.
 * Zero means today; negative should never reach the UI, since the query only
 * returns events from today onward.
 */
export function daysUntil(date: Date, now = new Date()): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", or "in N days" — what a person would actually say. */
export function countdownLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}
