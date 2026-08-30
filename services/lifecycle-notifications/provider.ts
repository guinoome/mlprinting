import type { NotificationProvider } from "./types";

/** Default durable in-app delivery; external email/SMS adapters use this contract. */
export const inAppNotificationProvider: NotificationProvider = {
  id: "in-app",
  async send() {
    return { ok: true };
  },
};
