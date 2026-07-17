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
import { customerNav } from "@/lib/config/navigation";
import { getProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const profile = await getProfile();
  const firstName = profile?.displayName?.trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description="Your events, orders, and media — all in one place."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customerNav.map(({ label, href, icon: Icon, description, phase }) => (
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
