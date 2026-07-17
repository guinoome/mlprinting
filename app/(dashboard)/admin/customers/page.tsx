import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Customers",
};

export default function AdminCustomersPage() {
  return (
    <PlaceholderModule
      title="Customers"
      description="Customer accounts and their history."
      icon={Users}
      phase={7}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Customers" },
      ]}
    />
  );
}
