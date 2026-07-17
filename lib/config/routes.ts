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

  /** Template Marketplace — Ph2. Public: browsing needs no account. */
  templates: "/templates",
  template: (slug: string) => `/templates/${slug}`,

  /**
   * Guided Invitation Builder — Ph3, not built.
   *
   * Registered now because Ph2's "Use Template" has to hand off somewhere, and
   * a string literal buried in an action is how a route rename becomes a dead
   * link. Gated behind features.invitationBuilder, so nothing reaches it yet.
   */
  builder: "/builder",

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
