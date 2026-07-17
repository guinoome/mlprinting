import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminNav } from "@/lib/config/navigation";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Back office for ML Printing staff."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminNav.map(({ label, href, icon: Icon, description, phase }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card className="h-full transition-colors hover:border-foreground/20">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  {phase > 1 ? (
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Phase {phase}
                    </span>
                  ) : (
                    <ArrowRight
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
