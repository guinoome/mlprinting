import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes, branding } from "@/lib/config";

/**
 * Shown when a route needs a backend that this deployment has not been given.
 *
 * Phase 1 is buildable and runnable with no secrets, which is what lets CI
 * verify it. The cost is that the dashboards render against nothing. This is
 * the honest failure: an unfinished deployment, not a broken page.
 */
export function ConfigurationRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-warning/10">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
          </div>
          <CardTitle>Setup incomplete</CardTitle>
          <CardDescription>
            This deployment of {branding.shortName} has no authentication or
            database backend configured, so the dashboard has nothing to show.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you are setting this up, follow{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              docs/deployment-workflow.md
            </code>{" "}
            to create the Supabase project, fill in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              .env.local
            </code>
            , and run the database migration.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={routes.home}>Back to site</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
