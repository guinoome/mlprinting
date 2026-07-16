/**
 * Role structure — Phase 0 scaffold.
 *
 * Per ML-DES.md §7 and Ph1.md §4: establish the role structure only.
 * No permission logic yet — that arrives in Phase 1 (Ph1.md "Role-Based
 * Access Structure", explicitly "No advanced permission system yet").
 */

export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Route prefixes that require an authenticated session.
 * Empty of business routes in Phase 0 — dashboards land in Phase 1.
 * The middleware reads this; adding a route here is all that's needed later.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  // "/dashboard",  // Phase 1 — Customer Dashboard
  // "/admin",      // Phase 1 — Admin Dashboard
];

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
