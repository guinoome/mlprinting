import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { ROLES, type Role } from "./roles";
import { logger } from "@/lib/logger";

/**
 * Session reading — Ph1.md §4 (Session Management).
 *
 * `server-only` is load-bearing: this module reaches the database and would
 * leak the whole Profile table's shape into a client bundle if imported from a
 * Client Component. The import turns that mistake into a build error.
 *
 * Wrapped in React's `cache` so a layout, a page, and a nav component that all
 * ask "who is this?" during one render share a single round trip.
 */

export interface SessionProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
}

/**
 * The authenticated Supabase user, or null.
 *
 * getUser() revalidates the token with Supabase on every call. Do not swap it
 * for getSession(), which trusts the cookie without verifying it — a forged
 * cookie would then pass. The extra round trip is the point.
 */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});

/**
 * The current user's Profile, creating it on first sight.
 *
 * Supabase Auth owns the identity; this row owns the app-level data attached to
 * it. They are created at different moments — a user exists the instant they
 * confirm their email, which happens outside our app — so the profile is
 * reconciled on first authenticated request rather than at signup. That keeps
 * one code path instead of a signup path plus a database trigger that silently
 * disagrees with it.
 */
export const getProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getUser();
  if (!user || !isDatabaseConfigured()) return null;

  const email = user.email;
  if (!email) {
    logger.warn("Authenticated user has no email; cannot reconcile profile", {
      userId: user.id,
    });
    return null;
  }

  try {
    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      // Role is absent from `update` on purpose. This runs on every request; if
      // it wrote a role, an admin promoted in the database would be demoted to
      // CUSTOMER on their next page load.
      update: { email },
      create: {
        id: user.id,
        email,
        displayName:
          (user.user_metadata?.display_name as string | undefined) ?? null,
        role: ROLES.CUSTOMER,
        preferences: { create: {} },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
      },
    });

    return profile;
  } catch (error) {
    logger.report(error, { at: "getProfile", userId: user.id });
    return null;
  }
});

/** True when the app has enough configuration to actually authenticate anyone. */
export function isAuthConfigured(): boolean {
  return isSupabaseConfigured() && isDatabaseConfigured();
}
