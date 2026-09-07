import Link from "next/link";
import { Button } from "@/components/ui/button";
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
          className="text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          {branding.shortName}
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {features.templateMarketplace ? (
            <Link
              href={routes.templates}
              className="rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Templates
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
      </div>
    </header>
  );
}
