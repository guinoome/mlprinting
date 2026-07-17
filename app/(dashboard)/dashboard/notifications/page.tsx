import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <PlaceholderModule
      title="Notifications"
      description="Updates about your events, orders, and approvals."
      icon={Bell}
      phase={9}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard.root },
        { label: "Notifications" },
      ]}
    />
  );
}
