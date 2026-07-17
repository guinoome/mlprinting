/**
 * Role structure — Ph1.md §4 ("Role-Based Access Structure").
 *
 * Deliberately a structure, not a permission system: the spec says "No advanced
 * permission system yet". Roles gate whole route trees, nothing finer. Resist
 * growing per-action permissions here until a phase actually asks for them.
 */

export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Route prefixes that require an authenticated session.
 * The middleware reads this; adding a route here is all that's needed.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  "/dashboard",
  "/admin",
];

/**
 * Route prefixes that additionally require a back-office role.
 *
 * Enforced in the /admin layout rather than the middleware, because the role
 * lives in the database and the middleware runs on the edge without Prisma.
 * The middleware proves *who* you are; the layout decides *what* you may see.
 */
export const STAFF_ROUTE_PREFIXES: readonly string[] = ["/admin"];

/** Roles allowed into the back office. Customers are not. */
export const STAFF_ROLES: readonly Role[] = [ROLES.ADMIN, ROLES.STAFF];

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return matches(pathname, PROTECTED_ROUTE_PREFIXES);
}

export function isStaffRoute(pathname: string): boolean {
  return matches(pathname, STAFF_ROUTE_PREFIXES);
}

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
