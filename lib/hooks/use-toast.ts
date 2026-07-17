"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  type Notification,
} from "@/lib/notifications/store";

/**
 * React binding for the notification store — Ph1.md §7.
 *
 * The server snapshot is a stable empty array: notifications are ephemeral
 * client state, and returning a fresh `[]` per call would loop the renderer.
 */
const EMPTY: Notification[] = [];

export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export { notify } from "@/lib/notifications/store";
