import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { listOrdersForCustomer } from "@/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ORDER_STATUS_LABELS } from "@/features/orders/labels";

export const metadata: Metadata = {
  title: "My Orders",
};

export default async function OrdersPage() {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const orders = await listOrdersForCustomer(profile.id);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Orders" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <p className="text-muted-foreground text-sm">
          Your print orders and their progress.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag aria-hidden="true" />}
          title="No orders yet"
          description="When you place an order with ML Printing, it will appear here."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {orders.map((order) => {
            const awaiting = order.items.filter(
              (item) => item.status === "CUSTOMER_REVIEW",
            ).length;
            return (
              <li key={order.id}>
                <Link
                  href={`${routes.dashboard.orders}/${order.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{order.reference}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {order.invitation?.title ?? "—"} · {order.items.length}{" "}
                      item{order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {awaiting > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        {awaiting} to review
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-sm">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
