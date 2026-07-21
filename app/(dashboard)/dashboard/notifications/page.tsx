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

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const orders = await listOrdersForCustomer(profile.id);
  const notifications = deriveCustomerNotifications(orders);

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
        <p className="text-muted-foreground text-sm">
          Updates about your orders and approvals.
        </p>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden="true" />}
          title="You're all caught up"
          description="We'll let you know when something needs your attention."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {notifications.map((note, index) => (
            <li key={`${note.orderId}-${note.kind}-${index}`}>
              <Link
                href={`${routes.dashboard.orders}/${note.orderId}`}
                className="hover:bg-muted/40 flex items-center gap-3 p-4 text-sm"
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
