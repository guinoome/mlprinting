import "server-only";

import { logger } from "@/lib/logger";
import { planLifecycleNotifications } from "./planner";
import {
  claimDue,
  loadLifecycleContext,
  recordDelivery,
  savePlans,
} from "./repository";
import type { NotificationProvider } from "./types";

export { listForProfile } from "./repository";
export { readNotificationPayload } from "./types";
export type { NotificationPayload, NotificationProvider } from "./types";

export async function scheduleLifecycleNotifications(invitationId: string) {
  try {
    const context = await loadLifecycleContext(invitationId);
    if (!context) return false;
    const plans = planLifecycleNotifications({
      invitationId,
      eventDate: context.eventDate,
      emailNotifications: context.emailNotifications,
      marketingEmails: context.marketingEmails,
      memory: context.memorySettings,
    });
    await savePlans(context.profileId, invitationId, plans);
    return true;
  } catch (error) {
    logger.report(error, {
      at: "scheduleLifecycleNotifications",
      invitationId,
    });
    return false;
  }
}

export async function dispatchDueNotifications(
  provider: NotificationProvider,
  now = new Date(),
) {
  const due = await claimDue(now);
  for (const notification of due) {
    const result = await provider.send({
      id: notification.id,
      kind: notification.kind,
      payload: notification.payload,
    });
    await recordDelivery(notification.id, result);
  }
  return due.length;
}
