import { describe, expect, it } from "vitest";
import { isActiveNav, customerNav, adminNav } from "./navigation";
import { routes } from "./routes";

describe("isActiveNav", () => {
  it("matches the exact route", () => {
    expect(isActiveNav("/dashboard/orders", "/dashboard/orders")).toBe(true);
  });

  it("matches a child route so a section stays lit while nested", () => {
    expect(isActiveNav("/dashboard/orders/123", "/dashboard/orders")).toBe(
      true,
    );
  });

  it("does not match a sibling that shares a string prefix", () => {
    expect(isActiveNav("/admin/templates", "/admin/template")).toBe(false);
  });

  it("does not match an unrelated route", () => {
    expect(isActiveNav("/dashboard/events", "/dashboard/orders")).toBe(false);
  });
});

describe("navigation registries", () => {
  it("covers every Customer Dashboard section from Ph1 §6", () => {
    expect(customerNav.map((i) => i.label)).toEqual([
      "My Events",
      "My Orders",
      "Media Library",
      "Notifications",
      "Account",
    ]);
  });

  it("covers every Admin Dashboard section from Ph1 §6", () => {
    expect(adminNav.map((i) => i.label)).toEqual([
      "Bookings",
      "Templates",
      "Production",
      "Customers",
      "Promotions",
      "Reports",
      "Settings",
    ]);
  });

  it("points every item at a registered route", () => {
    const known = new Set([
      ...Object.values(routes.dashboard),
      ...Object.values(routes.admin),
    ]);

    for (const item of [...customerNav, ...adminNav]) {
      expect(known).toContain(item.href);
    }
  });

  it("keeps each nav tree within its own route prefix", () => {
    expect(customerNav.every((i) => i.href.startsWith("/dashboard"))).toBe(
      true,
    );
    expect(adminNav.every((i) => i.href.startsWith("/admin"))).toBe(true);
  });
});
