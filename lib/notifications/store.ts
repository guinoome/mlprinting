/**
 * Notification store — Ph1.md §7.
 *
 * A framework-free observable store so `notify()` is callable from anywhere,
 * not just from inside a React component. That matters because the most common
 * caller is a `catch` block in an event handler or a Server Action result
 * handler, where hook rules make a context-based API awkward.
 *
 * React binds to this through lib/hooks/use-toast.ts.
 */

export type NotificationLevel = "success" | "warning" | "error" | "info";

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  description?: string;
  /** Milliseconds until auto-dismiss. `null` keeps it until dismissed. */
  duration: number | null;
}

export type NotificationInput = Omit<
  Notification,
  "id" | "level" | "duration"
> & {
  duration?: number | null;
};

/**
 * Errors hold the screen until dismissed. Everything else clears itself.
 * An error that vanishes after four seconds is an error the user never read.
 */
const DEFAULT_DURATION: Record<NotificationLevel, number | null> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: null,
};

/** Older notifications are dropped past this; a wall of toasts informs nobody. */
const MAX_VISIBLE = 4;

type Listener = (notifications: Notification[]) => void;

let notifications: Notification[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  // A fresh array per emit: useSyncExternalStore compares by reference.
  const snapshot = notifications;
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Notification[] {
  return notifications;
}

export function dismiss(id: string) {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

export function dismissAll() {
  notifications = [];
  emit();
}

function push(level: NotificationLevel, input: NotificationInput): string {
  const id = `n${++counter}`;
  const notification: Notification = {
    id,
    level,
    title: input.title,
    description: input.description,
    duration:
      input.duration === undefined ? DEFAULT_DURATION[level] : input.duration,
  };

  notifications = [...notifications, notification].slice(-MAX_VISIBLE);
  emit();
  return id;
}

/**
 * Raise a notification. Returns the id so a caller can dismiss it early —
 * e.g. an "Uploading…" info toast replaced by a success once the upload lands.
 */
export const notify = {
  success: (input: NotificationInput) => push("success", input),
  warning: (input: NotificationInput) => push("warning", input),
  error: (input: NotificationInput) => push("error", input),
  info: (input: NotificationInput) => push("info", input),
  dismiss,
  dismissAll,
};

/** Test seam — resets module state between cases. */
export function __resetNotifications() {
  notifications = [];
  listeners.clear();
  counter = 0;
}
