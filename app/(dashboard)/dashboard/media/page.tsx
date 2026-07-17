import type { Metadata } from "next";
import { Images } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Media Library",
};

export default function MediaPage() {
  return (
    <PlaceholderModule
      title="Media Library"
      description="Photos and files you have uploaded, reusable across events."
      icon={Images}
      phase={4}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard.root },
        { label: "Media Library" },
      ]}
    />
  );
}
