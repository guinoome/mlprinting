import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { branding, routes, features } from "@/lib/config";
import { getUser } from "@/lib/auth/session";

/**
 * Public site header — used by the landing page and the marketplace.
 *
 * A Server Component that reads the session itself, so no page has to thread a
 * user through just to decide between "Sign in" and "Dashboard".
 */
export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link
          href={routes.home}
          className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          {branding.shortName}
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {features.templateMarketplace ? (
            <Link
              href={routes.templates}
              className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Templates
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
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
        </div>

        {/* A phone gets one primary action and one compact menu. Squeezing the
            desktop navigation into 320px made the brand wrap and every target
            compete for space. Native details keeps this usable without adding
            client-side menu state. */}
        <div className="ml-auto flex items-center gap-2 sm:hidden">
          {user ? (
            <Button asChild size="sm">
              <Link href={routes.dashboard.root}>Dashboard</Link>
            </Button>
          ) : features.registration ? (
            <Button asChild size="sm" className="px-3">
              <Link href={routes.register}>Get started</Link>
            </Button>
          ) : null}

          <details className="group relative">
            <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open site menu</span>
            </summary>
            <nav className="absolute right-0 top-12 z-50 grid min-w-44 gap-1 rounded-lg border border-border bg-background p-2 text-sm shadow-xl">
              {features.templateMarketplace ? (
                <Link
                  href={routes.templates}
                  className="flex min-h-11 items-center rounded-md px-3 font-medium hover:bg-muted"
                >
                  Templates
                </Link>
              ) : null}
              {user ? null : (
                <Link
                  href={routes.login}
                  className="flex min-h-11 items-center rounded-md px-3 font-medium hover:bg-muted"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
