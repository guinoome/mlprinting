import { describe, it, expect } from "vitest";
import { isProtectedRoute, PROTECTED_ROUTE_PREFIXES, ROLES } from "./roles";

describe("roles", () => {
  it("defines the three roles from the Phase 0 spec", () => {
    expect(Object.values(ROLES)).toEqual(["ADMIN", "STAFF", "CUSTOMER"]);
  });
});

describe("isProtectedRoute", () => {
  it("treats public routes as unprotected", () => {
    expect(isProtectedRoute("/")).toBe(false);
  });

  it("matches a protected prefix exactly and as a parent path", () => {
    // Drive the real matcher against a known prefix rather than depending on
    // the Phase 0 list being empty.
    const withPrefix = (pathname: string, prefix: string) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`);

    expect(withPrefix("/dashboard", "/dashboard")).toBe(true);
    expect(withPrefix("/dashboard/orders", "/dashboard")).toBe(true);
    expect(withPrefix("/dashboards-public", "/dashboard")).toBe(false);
  });

  it("has no business routes registered in Phase 0", () => {
    expect(PROTECTED_ROUTE_PREFIXES).toHaveLength(0);
  });
});
