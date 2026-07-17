import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding, routes, features } from "@/lib/config";
import { getUser } from "@/lib/auth/session";

/**
 * Landing page — Ph1.md §2.
 *
 * The primary action depends on who is asking: a signed-in visitor is offered
 * their dashboard, not an invitation to sign up for an account they already
 * have.
 */
/**
 * Dynamic because the header branches on the session. Prerendered, this page
 * would show "Sign in" to someone who already is.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-6">
        <span className="text-sm font-semibold tracking-tight">
          {branding.shortName}
        </span>
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href={routes.dashboard.root}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.login}>Sign in</Link>
              </Button>
              {features.registration ? (
                <Button asChild size="sm">
                  <Link href={routes.register}>Get started</Link>
                </Button>
              ) : null}
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {branding.company}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {branding.product}
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            {branding.tagline}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={user ? routes.dashboard.root : routes.register}>
              {user ? "Go to dashboard" : "Get started"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>

          {/*
            Template browsing is Ph2. Until then the control links to the
            dashboard rather than to a route that does not exist — a button that
            404s is worse than one that is honest about where it goes.
          */}
          <Button asChild variant="outline" size="lg">
            <Link
              href={
                features.templateMarketplace
                  ? routes.templates
                  : routes.dashboard.root
              }
            >
              Browse templates
            </Link>
          </Button>
        </div>

        <p className="mt-8 max-w-md text-xs text-muted-foreground">
          Phase 1 — core platform. Invitation building, templates, and payments
          arrive in later phases.
        </p>
      </main>

      <footer className="p-6 text-center text-xs text-muted-foreground">
        {branding.company} — {branding.location}
      </footer>
    </div>
  );
}
