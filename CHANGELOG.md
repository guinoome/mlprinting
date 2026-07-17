# Changelog

All notable changes to ML-DEP are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0, the minor version tracks the completed phase: `0.1.0` = Phase 0 done,
`0.2.0` = Phase 1 done, and so on. `1.0.0` is the MVP launch at the end of
Phase 10.

## [Unreleased]

### Added

- Phase 1 — core platform skeleton.
  - Authentication: login, registration, logout, session management, password
    change. Route protection registered for `/dashboard` and `/admin`.
  - Role-based access structure: session gate in middleware, role gate in the
    `/admin` layout (the role is a database column; the edge has no Prisma).
  - Navigation shell: top nav, sidebar, mobile drawer, breadcrumbs, user menu,
    settings menu — all driven by one registry in `lib/config/navigation.ts`.
  - Customer dashboard (My Events, My Orders, Media Library, Notifications,
    Account) and admin dashboard (Bookings, Templates, Production, Customers,
    Promotions, Reports, Settings). Business sections are placeholders that name
    the phase which fills them in.
  - User management: profile, profile picture, password change, preferences
    (theme, email notifications) — `Preference` model added to the schema.
  - Notification framework: success/warning/error/info toasts on a
    framework-free store, so `notify()` is callable outside React.
  - File upload framework (`services/upload`): validation, constraints, and a
    Supabase Storage seam for Ph4's Media Library to reuse.
  - Logging framework (`lib/logger.ts`): structured JSON, credential redaction,
    and a single `report()` seam for a future error-tracking service.
  - Centralised configuration (`lib/config/`): branding, routes, feature flags.
    Every business capability ships dark and is flag-gated to its phase.
  - Error pages (404, route boundary, global boundary), loading skeletons, and a
    reusable empty state.
  - Design tokens expanded to a full semantic palette (card, popover, accent,
    destructive, success, warning, info, ring, input) with a dark theme and a
    no-flash theme script.

### Changed

- `lib/db.ts` constructs Prisma lazily behind a Proxy. It was instantiated at
  module load, which throws without `DATABASE_URL` — any page importing it would
  have broken the secret-less CI build.
- Authenticated routes are pinned `force-dynamic`. Without it their rendering
  mode depended on whether env vars happened to be set at build time, and a
  secret-less build prerendered the dashboard into static HTML.

### Security

- Next.js upgraded 14.2.21 → 14.2.35, patching the advisory of 2025-12-11.

- Phase 0 — repository foundation.
  - Next.js 14 App Router + TypeScript, strict mode.
  - Tailwind CSS with semantic design tokens; `Button` primitive.
  - Supabase Auth scaffold: browser/server clients, session-refresh middleware,
    protected-route structure (no routes registered yet — Phase 1 adds them).
  - Prisma schema with `Profile` model and `ADMIN`/`STAFF`/`CUSTOMER` roles.
  - ESLint + Prettier, Vitest (unit) + Playwright (e2e).
  - GitHub Actions CI: lint, typecheck, test, build.
  - Architecture, folder structure, development, and deployment docs.

[Unreleased]: https://github.com/guinoome/mlprinting/commits/main
