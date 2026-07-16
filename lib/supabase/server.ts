import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { CookiesToSet } from "./types";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Must be created per-request — never share an instance across requests.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: middleware refreshes the session instead.
        }
      },
    },
  });
}
