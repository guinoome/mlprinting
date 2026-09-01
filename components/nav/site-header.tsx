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
    <header className="supports-[backdrop-filter]:bg-[#090909]/88 sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 md:px-8">
        <Link
          href={routes.home}
          className="font-serif text-xl leading-none tracking-[.08em] text-[#dfbd7e] transition-opacity hover:opacity-75"
        >
          {branding.shortName}
          <span className="text-white/46 block pt-1 font-sans text-[7px] uppercase tracking-[.34em]">
            Printing
          </span>
        </Link>

        <nav className="text-white/58 hidden items-center gap-7 text-[9px] font-semibold uppercase tracking-[.22em] sm:flex">
          {features.templateMarketplace ? (
            <Link
              href={routes.templates}
              className="transition-colors hover:text-white"
            >
              Invitations
            </Link>
          ) : null}
          <Link
            href="/#experience-proofs"
            className="transition-colors hover:text-white"
          >
            Experiences
          </Link>
          <Link
            href="/#questions"
            className="transition-colors hover:text-white"
          >
            Questions
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button
              asChild
              size="sm"
              className="bg-[#b3874b] text-white hover:bg-[#c89b5b]"
            >
              <Link href={routes.dashboard.root}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Link href={routes.login}>Sign in</Link>
              </Button>
              {features.registration ? (
                <Button
                  asChild
                  size="sm"
                  className="rounded-full border border-[#dfbd7e] bg-transparent text-white hover:bg-[#dfbd7e] hover:text-black"
                >
                  <Link href={routes.register}>Begin</Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
