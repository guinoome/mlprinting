import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/site-header";
import { branding, routes, features, social } from "@/lib/config";
import { MessengerButton } from "@/components/messenger-button";

/**
 * Marketplace layout — Ph2.md.
 *
 * Public. Ph2.md's Success Criteria has the customer browse, search, filter,
 * preview, and select; only the last of those needs an account, so gating the
 * whole marketplace behind a login would hide the shop window to protect the
 * till.
 */
export const dynamic = "force-dynamic";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The flag gates the routes, not just the nav link. Leaving the pages
  // reachable while the header pretends they do not exist is the worst of both.
  if (!features.templateMarketplace) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        {children}
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground md:px-8">
        {branding.company} — {branding.location} ·{" "}
        <Link
          href={routes.home}
          className="transition-colors hover:text-foreground"
        >
          Back to home
        </Link>
        {" · "}
        <a
          href={social.messenger}
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-foreground"
        >
          Message us
        </a>
        {" · "}
        <a
          href={social.facebook}
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-foreground"
        >
          Facebook
        </a>
      </footer>

      <MessengerButton />
    </div>
  );
}
