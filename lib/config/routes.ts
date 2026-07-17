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

  /** Guided Invitation Builder — Ph3. */
  builder: "/builder",
  /**
   * Starts a draft, optionally from `?template=<slug>`.
   *
   * This is the handoff from the marketplace. Ph2 redirects here rather than
   * importing the builder's create action — a feature may not import another
   * feature, and a shared route in config is how they meet.
   */
  builderNew: "/builder/new",
  builderStep: (id: string, step: string) => `/builder/${id}/${step}`,

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
