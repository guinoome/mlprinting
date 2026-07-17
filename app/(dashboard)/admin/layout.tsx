import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/app-shell";
import { adminNav } from "@/lib/config/navigation";
import { routes } from "@/lib/config";
import { getUser, getProfile, isAuthConfigured } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/roles";
import { ConfigurationRequired } from "@/components/configuration-required";
import { logger } from "@/lib/logger";

/**
 * Admin Dashboard layout — Ph1.md §2, §4, §6.
 *
 * This is where role enforcement lives. The middleware proves *who* the caller
 * is but cannot decide *what* they may see: the role is a database column, and
 * the middleware runs on the edge without Prisma. So the session gate is
 * upstream and the role gate is here, next to the data it protects.
 *
 * A customer who reaches /admin is sent to their own dashboard rather than to
 * login — they are signed in; they are simply not staff. Bouncing them to a
 * login form they have already passed is a loop, not an answer.
 */
/** Never prerender, never cache — see the dashboard layout for why. */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthConfigured()) return <ConfigurationRequired />;

  const user = await getUser();
  if (!user) redirect(routes.login);

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  if (!isStaffRole(profile.role)) {
    // Worth a log line: in normal use nobody navigates here by accident, so
    // this is either a probe or a role that was set wrong.
    logger.warn("Non-staff attempted to reach the admin dashboard", {
      userId: profile.id,
      role: profile.role,
    });
    redirect(routes.dashboard.root);
  }

  return (
    <AppShell
      items={adminNav}
      profile={profile}
      label="Admin"
      homeHref={routes.admin.root}
    >
      {children}
    </AppShell>
  );
}
