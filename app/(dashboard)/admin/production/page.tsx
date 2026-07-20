import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { requireStaff } from "@/lib/auth/require-staff";
import { listBoardItems } from "@/services/orders";
import { ProductionBoard } from "@/features/production/components/production-board";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Production",
};

export default async function AdminProductionPage() {
  await requireStaff();

  const items = await listBoardItems();

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: routes.admin.root },
          { label: "Production" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Production</h1>
        <p className="text-muted-foreground text-sm">
          Every deliverable currently in flight. {items.length} item
          {items.length === 1 ? "" : "s"}.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<Factory aria-hidden="true" />}
          title="Nothing in production"
          description="Deliverables appear here as soon as an order has work on it."
        />
      ) : (
        <ProductionBoard items={items} />
      )}
    </div>
  );
}
