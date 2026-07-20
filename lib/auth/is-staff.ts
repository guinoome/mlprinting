import type { Role } from "@prisma/client";

/**
 * The staff predicate — Phase 7c.
 *
 * Deliberately its own module, importing nothing but a type. `require-staff.ts`
 * reaches for the session, which pulls in React's `cache()` and a Supabase
 * client; both are unavailable outside a server request, which would make this
 * rule untestable if the two lived together.
 *
 * Takes the narrowest possible shape rather than a full SessionProfile, so a
 * test does not have to construct a session to assert on a role.
 */
export function isStaff(profile: { role: Role } | null): boolean {
  return profile?.role === "ADMIN" || profile?.role === "STAFF";
}
