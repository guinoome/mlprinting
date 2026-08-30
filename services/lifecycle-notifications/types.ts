export type LifecycleKind =
  "MEMORY_PROMPT" | "THANK_YOU" | "ARCHIVE_READY" | "REVIEW_REQUEST";

export interface PlannedNotification {
  kind: LifecycleKind;
  scheduledAt: Date;
  consentBasis: string | null;
  payload: { title: string; message: string; href: string };
}

export interface NotificationDelivery {
  id: string;
  kind: LifecycleKind;
  payload: unknown;
}

export interface NotificationPayload {
  title: string;
  message: string;
  href: string;
}

export interface NotificationProvider {
  readonly id: string;
  send(
    delivery: NotificationDelivery,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
}

export function readNotificationPayload(
  value: unknown,
): NotificationPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.href === "string" &&
    candidate.href.startsWith("/") &&
    !candidate.href.startsWith("//")
    ? {
        title: candidate.title,
        message: candidate.message,
        href: candidate.href,
      }
    : null;
}
