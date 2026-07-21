import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for Client Components (browser).
 * Uses the anon key — safe to expose; row-level security enforces access.
 */
export function createClient() {
  return createBrowserClient(env.supabase.url, env.supabase.publishableKey);
}
