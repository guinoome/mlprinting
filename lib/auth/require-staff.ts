import { notFound } from "next/navigation";
import { getProfile, type SessionProfile } from "./session";
import { isStaff } from "./is-staff";

export { isStaff };

/**
 * The profile, if it belongs to staff. Otherwise 404 — never a redirect.
 *
 * A redirect to sign-in tells an unauthenticated stranger that the page exists,
 * and a redirect to the dashboard tells a signed-in customer the same thing.
 * The internal production surfaces should be indistinguishable from URLs that
 * were never routed.
 *
 * Call this in Server Actions too, not only in page loads: an action is
 * reachable by POST regardless of what was rendered.
 */
export async function requireStaff(): Promise<SessionProfile> {
  const profile = await getProfile();
  if (!isStaff(profile)) notFound();
  return profile as SessionProfile;
}
