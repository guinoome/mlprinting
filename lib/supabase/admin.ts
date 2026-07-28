import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 *
 * Added for admin template artwork (Instructions 4) and deliberately scoped to
 * that use. Two reasons the request-scoped client in server.ts cannot do the
 * job:
 *
 * 1. It authenticates as the signed-in user, so every write is subject to
 *    storage RLS. The template-assets bucket is public for *reads* only —
 *    public does not grant INSERT — so an admin upload would be refused unless
 *    storage policies were authored and maintained alongside it.
 * 2. It calls cookies(), which ties it to a request scope.
 *
 * The safety argument for bypassing RLS here is that authorisation has already
 * happened, in the layer that should own it: every caller passes through
 * requireStaff() first, and that check does not depend on a policy being
 * written correctly in a dashboard nobody reviews.
 *
 * The cost is real and worth naming: a missing requireStaff() on some future
 * caller is no longer caught by a second line of defence. So this module must
 * stay small, and anything reaching for it belongs behind a staff guard.
 */

let cached: ReturnType<typeof createSupabaseClient> | null = null;

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Admin storage writes are unavailable.",
    );
  }

  // Safe to reuse, unlike the request-scoped client: there is no per-request
  // state here, no cookies and no user session to leak between requests.
  cached ??= createSupabaseClient(env.supabase.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
