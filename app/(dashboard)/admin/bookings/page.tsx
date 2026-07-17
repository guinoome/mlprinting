import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function AdminBookingsPage() {
  return (
    <PlaceholderModule
      title="Bookings"
      description="Incoming bookings and their scheduling."
      icon={ClipboardList}
      phase={7}
      breadcrumbs={[
        { label: "Admin", href: routes.admin.root },
        { label: "Bookings" },
      ]}
    />
  );
}
