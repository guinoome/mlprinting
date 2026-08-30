import type { PlannedNotification } from "./types";

const daysAfter = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000);

export function planLifecycleNotifications(input: {
  invitationId: string;
  eventDate: Date | null;
  emailNotifications: boolean;
  marketingEmails: boolean;
  memory: {
    enabled: boolean;
    opensAt: Date | null;
    closesAt: Date | null;
  } | null;
}): PlannedNotification[] {
  if (!input.eventDate) return [];
  const href = `/dashboard/events/${input.invitationId}/memories`;
  const plans: PlannedNotification[] = [];
  if (input.memory?.enabled) {
    plans.push({
      kind: "MEMORY_PROMPT",
      scheduledAt: input.memory.opensAt ?? input.eventDate,
      consentBasis: "event-service",
      payload: {
        title: "Memory sharing is open",
        message: "Your guest memory link and QR code are ready to share.",
        href,
      },
    });
    plans.push({
      kind: "ARCHIVE_READY",
      scheduledAt: daysAfter(input.memory.closesAt ?? input.eventDate, 1),
      consentBasis: "event-service",
      payload: {
        title: "Review your event memories",
        message: "Approve the final collection and prepare the event archive.",
        href,
      },
    });
  }
  if (input.emailNotifications) {
    plans.push({
      kind: "THANK_YOU",
      scheduledAt: daysAfter(input.eventDate, 1),
      consentBasis: "transactional-preference",
      payload: {
        title: "Send your thank-you",
        message:
          "Your event has passed. Share a thank-you and approved memory gallery when ready.",
        href,
      },
    });
  }
  if (input.marketingEmails) {
    plans.push({
      kind: "REVIEW_REQUEST",
      scheduledAt: daysAfter(input.eventDate, 3),
      consentBasis: "marketing-opt-in",
      payload: {
        title: "Invite an honest review",
        message:
          "Ask for feedback only from customers who opted in to marketing follow-up.",
        href: "/dashboard/account",
      },
    });
  }
  return plans;
}
