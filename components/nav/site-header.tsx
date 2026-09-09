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
    <header className="supports-[backdrop-filter]:bg-[#0b0d12]/86 sticky top-0 z-40 border-b border-white/10 bg-[#0b0d12]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-7 px-4 md:px-8">
        <Link
          href={routes.home}
          className="grid shrink-0 whitespace-nowrap font-serif leading-none text-[#dfbd7e] transition-opacity hover:opacity-75"
          aria-label={`${branding.company} home`}
        >
          <span className="text-xl tracking-[0.12em]">ML</span>
          <span className="mt-1 font-sans text-[7px] font-semibold uppercase tracking-[0.34em] text-white/55">
            Printing
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.2em] sm:flex">
          {features.templateMarketplace ? (
            <Link
              href={routes.templates}
              className="text-white/58 transition-colors hover:text-[#dfbd7e]"
            >
              Invitations
            </Link>
          ) : null}
          <Link
            href={`${routes.home}#find-your-experience`}
            className="text-white/58 transition-colors hover:text-[#dfbd7e]"
          >
            Experiences
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {user ? (
            <Button asChild size="sm" className="rounded-none px-5">
              <Link href={routes.dashboard.root}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hover:bg-white/8 text-white/70 hover:text-white"
              >
                <Link href={routes.login}>Sign in</Link>
              </Button>
              {features.registration ? (
                <Button asChild size="sm" className="rounded-none px-5">
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
            <Button asChild size="sm" className="rounded-none px-4">
              <Link href={routes.dashboard.root}>Dashboard</Link>
            </Button>
          ) : features.registration ? (
            <Button asChild size="sm" className="rounded-none px-4">
              <Link href={routes.register}>Get started</Link>
            </Button>
          ) : null}

          <details className="group relative">
            <summary className="border-white/18 hover:bg-white/8 flex size-11 cursor-pointer list-none items-center justify-center border bg-transparent text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open site menu</span>
            </summary>
            <nav className="absolute right-0 top-12 z-50 grid min-w-48 gap-1 border border-white/15 bg-[#0b0d12] p-2 text-sm shadow-2xl">
              {features.templateMarketplace ? (
                <Link
                  href={routes.templates}
                  className="hover:bg-white/8 flex min-h-11 items-center px-3 font-medium text-white/75 hover:text-white"
                >
                  Templates
                </Link>
              ) : null}
              <Link
                href={`${routes.home}#find-your-experience`}
                className="hover:bg-white/8 flex min-h-11 items-center px-3 font-medium text-white/75 hover:text-white"
              >
                Experiences
              </Link>
              {user ? null : (
                <Link
                  href={routes.login}
                  className="hover:bg-white/8 flex min-h-11 items-center px-3 font-medium text-white/75 hover:text-white"
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
