import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-staff";
import { getOrderReport } from "@/services/orders";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { routes } from "@/lib/config";
import { ORDER_STATUS_LABELS } from "@/features/orders/labels";
import type { OrderStatusValue } from "@/services/orders";

export const metadata: Metadata = {
  title: "Reports",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 text-sm">{label}</p>
    </div>
  );
}

export default async function AdminReportsPage() {
  await requireStaff();

  const report = await getOrderReport();

  return (
    <div className="space-y-8 p-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: routes.admin.root },
          { label: "Reports" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Where the shop stands right now. Detailed analytics come later.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active bookings" value={report.activeBookings} />
        <Stat label="Pending approvals" value={report.pendingApprovals} />
        <Stat label="In production" value={report.productionWorkload} />
        <Stat label="Completed orders" value={report.completedOrders} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Orders by status</h2>
        <ul className="divide-y rounded-md border">
          {(Object.keys(report.ordersByStatus) as OrderStatusValue[]).map(
            (status) => (
              <li
                key={status}
                className="flex items-center justify-between p-3 text-sm"
              >
                <span>{ORDER_STATUS_LABELS[status]}</span>
                <span className="text-muted-foreground tabular-nums">
                  {report.ordersByStatus[status]}
                </span>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
