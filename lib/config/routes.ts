/**
 * Route registry — Ph1.md §10 (URLs).
 *
 * Every internal link resolves through here. String literals scattered across
 * components are how a rename becomes a hunt for dead links.
 */

export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  templates: "/templates",

  dashboard: {
    root: "/dashboard",
    events: "/dashboard/events",
    orders: "/dashboard/orders",
    media: "/dashboard/media",
    notifications: "/dashboard/notifications",
    account: "/dashboard/account",
  },

  admin: {
    root: "/admin",
    bookings: "/admin/bookings",
    templates: "/admin/templates",
    production: "/admin/production",
    customers: "/admin/customers",
    promotions: "/admin/promotions",
    reports: "/admin/reports",
    settings: "/admin/settings",
  },
} as const;
