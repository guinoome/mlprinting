import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding, routes, features } from "@/lib/config";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * 404 — Ph1.md §2 (Error Pages).
 *
 * Offers somewhere to go, not only somewhere to leave. Most people who land
 * here followed a stale link to a template or an unpublished invitation, so the
 * catalogue is a better next step than the home page — and reporting a bug is
 * not a customer's job to be handed.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-serif text-6xl leading-none text-muted-foreground/40">
        404
      </p>

      <h1 className="mt-6 font-serif text-3xl tracking-tight">
        We can&rsquo;t find that page.
      </h1>

      <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
        The link may be out of date, or the invitation it pointed to is no
        longer published. The catalogue is a good place to pick things back up.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {features.templateMarketplace ? (
          <Button asChild>
            <Link href={routes.templates}>
              Browse templates
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={routes.home}>Back to home</Link>
        </Button>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        {branding.company} — {branding.location}
      </p>
    </main>
  );
}
