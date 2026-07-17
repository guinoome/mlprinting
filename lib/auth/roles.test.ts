import { describe, it, expect } from "vitest";
import {
  isProtectedRoute,
  isStaffRoute,
  isStaffRole,
  PROTECTED_ROUTE_PREFIXES,
  ROLES,
} from "./roles";

describe("roles", () => {
  it("defines the three roles from the spec", () => {
    expect(Object.values(ROLES)).toEqual(["ADMIN", "STAFF", "CUSTOMER"]);
  });

  it("admits admin and staff to the back office, but not customers", () => {
    expect(isStaffRole(ROLES.ADMIN)).toBe(true);
    expect(isStaffRole(ROLES.STAFF)).toBe(true);
    expect(isStaffRole(ROLES.CUSTOMER)).toBe(false);
  });
});

describe("isProtectedRoute", () => {
  it("treats public routes as unprotected", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/register")).toBe(false);
  });

  it("protects the dashboard and admin trees", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/orders")).toBe(true);
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/bookings")).toBe(true);
  });

  it("matches on path segments, not string prefixes", () => {
    // "/dashboards-public" starts with "/dashboard" as a string. Were the
    // matcher a bare startsWith, this route would be gated by accident.
    expect(isProtectedRoute("/dashboards-public")).toBe(false);
    expect(isProtectedRoute("/administration")).toBe(false);
  });

  it("registers both Phase 1 route trees", () => {
    expect(PROTECTED_ROUTE_PREFIXES).toEqual(["/dashboard", "/admin"]);
  });
});

describe("isStaffRoute", () => {
  it("covers admin but not the customer dashboard", () => {
    expect(isStaffRoute("/admin")).toBe(true);
    expect(isStaffRoute("/admin/reports")).toBe(true);
    expect(isStaffRoute("/dashboard")).toBe(false);
  });
});
