import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { listOrdersForCustomer } from "@/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { deriveCustomerNotifications } from "@/features/orders/notifications";
import {
  listForProfile,
  readNotificationPayload,
} from "@/services/lifecycle-notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const [orders, lifecycleNotifications] = await Promise.all([
    listOrdersForCustomer(profile.id),
    listForProfile(profile.id),
  ]);
  const notifications = deriveCustomerNotifications(orders);
  const lifecycle = lifecycleNotifications.flatMap((notification) => {
    const payload = readNotificationPayload(notification.payload);
    return payload ? [{ ...notification, payload }] : [];
  });
  const hasNotifications = notifications.length > 0 || lifecycle.length > 0;

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Notifications" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Updates about your orders, event memories, and post-event actions.
        </p>
      </header>

      {!hasNotifications ? (
        <EmptyState
          icon={<Bell aria-hidden="true" />}
          title="You're all caught up"
          description="We'll let you know when something needs your attention."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {lifecycle.map((notification) => (
            <li key={notification.id}>
              <Link
                href={notification.payload.href}
                className="flex items-start gap-3 p-4 text-sm hover:bg-muted/40"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    notification.status === "SENT"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}
                />
                <span>
                  <span className="block font-medium">
                    {notification.payload.title}
                  </span>
                  <span className="text-muted-foreground">
                    {notification.payload.message}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {notifications.map((note, index) => (
            <li key={`${note.orderId}-${note.kind}-${index}`}>
              <Link
                href={`${routes.dashboard.orders}/${note.orderId}`}
                className="flex items-center gap-3 p-4 text-sm hover:bg-muted/40"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${
                    note.kind === "review" ? "bg-amber-500" : "bg-green-500"
                  }`}
                />
                <span>{note.message}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
