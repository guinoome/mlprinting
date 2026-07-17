import Link from "next/link";
import { redirect } from "next/navigation";
import { branding, routes } from "@/lib/config";
import { getUser } from "@/lib/auth/session";

/**
 * Authentication layout — Ph1.md §2.
 *
 * Deliberately chrome-free: no nav, no sidebar. The only jobs on this screen
 * are to sign in or to leave, and every other control is a distraction from a
 * form the user wants to be done with.
 */
/** Dynamic: the redirect below depends on the session, so it cannot be baked. */
export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // An authenticated user has no business on the login screen.
  const user = await getUser();
  if (user) redirect(routes.dashboard.root);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-6">
        <Link
          href={routes.home}
          className="text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          {branding.shortName}
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="p-6 text-center text-xs text-muted-foreground">
        {branding.company} — {branding.location}
      </footer>
    </div>
  );
}
