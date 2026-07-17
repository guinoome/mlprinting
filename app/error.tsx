"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Route error boundary — Ph1.md §2 (Error Pages).
 *
 * Shows `digest`, not the message. Next.js replaces server error messages with
 * an opaque digest in production precisely so stack traces and query fragments
 * do not reach the browser; rendering `error.message` here would hand back what
 * the framework just took away. The digest is the string a user reads out and
 * an engineer greps the logs for.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.report(error, { at: "error-boundary", digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          The error has been logged. Try again — if it keeps happening, the
          reference below will help us find it.
        </p>
        {error.digest ? (
          <p className="pt-2 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href={routes.home}>Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
