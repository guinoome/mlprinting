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

  /**
   * The public event website — Ph5.md. No auth: guests have no ML-DEP account.
   * `slug` is the customer-chosen identifier from Invitation.slug.
   */
  publicEvent: (slug: string) => `/e/${slug}`,

  dashboard: {
    root: "/dashboard",
    events: "/dashboard/events",
    orders: "/dashboard/orders",
    media: "/dashboard/media",
    notifications: "/dashboard/notifications",
    account: "/dashboard/account",
    /** Publish control — Ph5.md's "Manage website" surface. */
    eventWebsite: (id: string) => `/dashboard/events/${id}/website`,
    /** RSVP list — Ph5.md §3. */
    eventRsvps: (id: string) => `/dashboard/events/${id}/rsvps`,
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
