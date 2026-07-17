import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/config";

export const metadata: Metadata = {
  title: "Page not found",
};

/** 404 — Ph1.md §2 (Error Pages). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          That page does not exist, or it moved. If you followed a link from
          within the platform, that link is a bug worth reporting.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={routes.home}>Back to home</Link>
      </Button>
    </main>
  );
}
