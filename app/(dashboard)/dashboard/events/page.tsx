import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "My Events",
};

export default function EventsPage() {
  return (
    <PlaceholderModule
      title="My Events"
      description="Events you are planning, and their invitations."
      icon={CalendarDays}
      phase={3}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard.root },
        { label: "My Events" },
      ]}
    />
  );
}
