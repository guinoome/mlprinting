import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { routes } from "@/lib/config";
import { safeRedirect } from "@/features/auth/redirect";

/**
 * Where every emailed auth link lands — confirmation and password recovery.
 *
 * Supabase does not send a session in those emails. It sends a one-time `code`,
 * and somebody has to exchange it for one. Nothing did: registration set
 * `emailRedirectTo` straight to the dashboard, so a customer who confirmed
 * their address arrived with a code in the URL, no session, and got bounced to
 * the login page by middleware — having done exactly what the email asked.
 *
 * A route handler rather than a page, because the exchange writes session
 * cookies and the response has to carry them. That is also why the redirect is
 * built from `request.url`: the cookies Supabase sets during the exchange ride
 * on the response this returns, and returning anything else drops them.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Where to go afterwards. Same sanitiser the login form uses, because this
  // parameter arrives in a URL anyone can compose — an unchecked value would
  // make a genuine mlprinting.vercel.app link land on a phishing clone.
  const next = safeRedirect(url.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  // Supabase reports its own failures here — an expired or already-used link.
  const errorDescription =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (errorDescription) {
    logger.warn("Auth callback rejected", { reason: errorDescription });
    return NextResponse.redirect(
      new URL(`${routes.login}?authError=link`, request.url),
    );
  }

  if (!code) {
    // Reached without a code at all — a bookmarked callback, or a crawler.
    return NextResponse.redirect(new URL(routes.login, request.url));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Codes are single-use and time-limited, so this is usually a link that was
    // already clicked or has aged out — an expected outcome, not a fault.
    logger.warn("Code exchange failed", { reason: error.message });
    return NextResponse.redirect(
      new URL(`${routes.login}?authError=link`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
