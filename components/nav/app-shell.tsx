import Link from "next/link";
import { branding, routes } from "@/lib/config";
import type { NavItem } from "@/lib/config/navigation";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import type { SessionProfile } from "@/lib/auth/session";

/**
 * A nav item with its icon already drawn.
 *
 * `NavItem.icon` is a Lucide component — a function — and a function cannot be
 * handed from a Server Component to a Client one. React serialises props across
 * that boundary, and there is no way to serialise code. Passing the array
 * straight through threw "Functions cannot be passed directly to Client
 * Components" on every authenticated page, which nobody saw for months because
 * sign-in was paused and this layout had therefore never rendered in
 * production.
 *
 * An element serialises fine, so the icon is rendered here — on the server —
 * and the client components receive the result rather than the recipe.
 */
export type RenderedNavItem = Omit<NavItem, "icon"> & {
  icon: React.ReactNode;
};

/**
 * The chrome shared by both dashboards — Ph1.md §2, §3.
 *
 * A Server Component: it reads the profile from its caller and passes plain
 * data to the interactive bits, so the session never crosses into a client
 * bundle. The nav items differ per dashboard; the frame does not.
 */
export function AppShell({
  items,
  profile,
  label,
  homeHref,
  children,
}: {
  items: readonly NavItem[];
  profile: SessionProfile;
  /** Which dashboard this is — shown beside the wordmark. */
  label: string;
  homeHref: string;
  children: React.ReactNode;
}) {
  const rendered: RenderedNavItem[] = items.map(({ icon: Icon, ...rest }) => ({
    ...rest,
    icon: <Icon className="size-4 shrink-0" aria-hidden="true" />,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation — Ph1.md §3 */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-2 px-4">
          <MobileNav items={rendered} />

          <Link
            href={homeHref}
            className="flex items-center gap-2 rounded-md px-1 py-1 transition-opacity hover:opacity-70"
          >
            <span className="text-sm font-semibold tracking-tight">
              {branding.shortName}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {label}
            </span>
          </Link>

          <div className="ml-auto">
            <UserMenu
              email={profile.email}
              displayName={profile.displayName}
              avatarUrl={profile.avatarUrl}
              role={profile.role}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — Ph1.md §3. Hidden below md; MobileNav carries it there. */}
        <aside className="hidden w-60 shrink-0 border-r border-border md:block">
          <div className="sticky top-14 p-3">
            <SidebarNav items={rendered} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground md:px-8">
        {branding.company} — {branding.location} ·{" "}
        <Link
          href={routes.home}
          className="transition-colors hover:text-foreground"
        >
          Back to site
        </Link>
      </footer>
    </div>
  );
}
