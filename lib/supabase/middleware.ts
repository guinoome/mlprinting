import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { isProtectedRoute } from "@/lib/auth/roles";
import type { CookiesToSet } from "./types";

/**
 * Refreshes the Supabase session on each request and gates protected routes.
 *
 * Phase 0: structure only. No role checks — Phase 1 adds those on top of the
 * session this establishes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without Supabase env vars (e.g. a CI build before secrets are wired up),
  // pass through rather than crash every request.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(
    env.supabase.url,
    env.supabase.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. Do not swap for getSession()
  // in middleware — that reads the cookie without verifying it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
