import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireStaff } from "@/lib/auth/require-staff";
import { listOrders } from "@/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Bookings",
};

const STATUS_LABELS: Record<string, string> = {
  INQUIRY: "Inquiry",
  QUOTATION: "Quotation",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

export default async function AdminBookingsPage() {
  await requireStaff();

  const orders = await listOrders();

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: routes.admin.root },
          { label: "Bookings" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-muted-foreground text-sm">
          Every order, newest first.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" />}
          title="No bookings yet"
          description="Orders appear here once they are created."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Items</th>
                <th className="py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{order.reference}</td>
                  <td className="py-2 pr-4">
                    {order.profile.displayName ?? order.profile.email}
                  </td>
                  <td className="py-2 pr-4">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </td>
                  <td className="py-2 pr-4">{order.items.length}</td>
                  <td className="py-2">
                    {order.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
