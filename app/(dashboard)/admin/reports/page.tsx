import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Reports",
};

export default function AdminReportsPage() {
  return (
    <PlaceholderModule
      title="Reports"
      description="Sales, production, and platform reporting."
      icon={BarChart3}
      phase={9}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Reports" },
      ]}
    />
  );
}
