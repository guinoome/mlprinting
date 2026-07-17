import type { Metadata } from "next";
import { LayoutTemplate } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Templates",
};

export default function AdminTemplatesPage() {
  return (
    <PlaceholderModule
      title="Templates"
      description="The invitation template catalogue."
      icon={LayoutTemplate}
      phase={2}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Templates" },
      ]}
    />
  );
}
