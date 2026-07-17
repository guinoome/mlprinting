import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Production",
};

export default function AdminProductionPage() {
  return (
    <PlaceholderModule
      title="Production"
      description="Print jobs moving through the shop."
      icon={Factory}
      phase={6}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Production" },
      ]}
    />
  );
}
