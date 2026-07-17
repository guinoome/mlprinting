import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { customerNav } from "@/lib/config/navigation";
import { routes } from "@/lib/config";
import { getUser, getProfile } from "@/lib/auth/session";
import { ConfigurationRequired } from "@/components/configuration-required";
import { isAuthConfigured } from "@/lib/auth/session";

/**
 * Customer Dashboard layout — Ph1.md §2, §6.
 *
 * The middleware already bounced anonymous requests here (lib/supabase/
 * middleware.ts). This check is not redundant: middleware can be bypassed by a
 * matcher gap or a config change, and a layout that assumes a user exists
 * because "something upstream checked" is how a page ends up rendering
 * somebody's dashboard to nobody. Authorisation belongs next to the data.
 */
/**
 * Never prerender, never cache. Without this the rendering mode depends on
 * whether env vars happened to be present at build time: with no Supabase
 * config, getUser() returns before touching cookies, Next sees nothing dynamic,
 * and it bakes these routes into static HTML. A statically served dashboard is
 * one user's shell handed to every visitor.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nothing is wired up yet — say so rather than redirect to a login that
  // cannot succeed either.
  if (!isAuthConfigured()) return <ConfigurationRequired />;

  const user = await getUser();
  if (!user) redirect(routes.login);

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  return (
    <AppShell
      items={customerNav}
      profile={profile}
      label="Dashboard"
      homeHref={routes.dashboard.root}
    >
      {children}
    </AppShell>
  );
}
