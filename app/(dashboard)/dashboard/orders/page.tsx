import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "My Orders",
};

export default function OrdersPage() {
  return (
    <PlaceholderModule
      title="My Orders"
      description="Print orders, their status, and their history."
      icon={ShoppingBag}
      phase={7}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard.root },
        { label: "My Orders" },
      ]}
    />
  );
}
