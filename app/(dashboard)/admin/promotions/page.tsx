import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Promotions",
};

export default function AdminPromotionsPage() {
  return (
    <PlaceholderModule
      title="Promotions"
      description="Campaigns, discounts, and their performance."
      icon={Megaphone}
      phase={9}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Promotions" },
      ]}
    />
  );
}
