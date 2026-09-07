import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { branding, routes } from "@/lib/config";
import { getUser } from "@/lib/auth/session";

/**
 * Authentication layout — Ph1.md §2.
 *
 * Chrome-free, but no longer anonymous. The image rail shows the quality of
 * the product before a customer entrusts the platform with an account. On a
 * phone it becomes a compact header so the form remains the first task.
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
    <div className="auth-stage">
      <aside className="auth-story" aria-label="ML Printing invitation preview">
        <Image
          src="/experiences/capiz-window-hero.png"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 100vw, 44vw"
          className="auth-story-image"
        />
        <div className="auth-story-scrim" />
        <Link href={routes.home} className="auth-brand">
          <span>{branding.shortName}</span>
          <small>Digital invitations by ML Printing</small>
        </Link>
        <div className="auth-story-copy">
          <p>Made for the moments people keep.</p>
          <span>
            Design, approve, share, and print from one invitation story.
          </span>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">{children}</div>
        <footer className="auth-footer">
          {branding.company} — {branding.location}
        </footer>
      </main>
    </div>
  );
}
