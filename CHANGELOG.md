# Changelog

All notable changes to ML-DEP are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0, the minor version tracks the completed phase: `0.1.0` = Phase 0 done,
`0.2.0` = Phase 1 done, and so on. `1.0.0` is the MVP launch at the end of
Phase 10.

## [Unreleased]

### Added

- Phase 3 — Guided Invitation Builder.
  - The invitation dataset (Ph3.md §12): `Invitation` with hosts, venues,
    content, people, programme, personalization, and media links. Content and
    presentation are separate records — no colour, font, or coordinate exists on
    an invitation row, which is what lets Ph5's website and Ph6's PDF render from
    the same data.
  - Eight-step guided workflow driven by a step registry, so a new step is one
    entry plus a form (§1). Save Draft and Continue to Order are deliberately
    not steps — autosave makes the first redundant, and the second is Ph7.
  - Event info, hosts, venues, content, media, and personalization steps
    (§2–§7). Hosts and venues are lists: §3 spans "Bride & Groom" to "Company",
    and a ceremony at 3pm with a reception at 6pm is one event with two clocks.
  - Autosave with three mechanisms (§8): debounced while typing, flush on
    blur/tab-hide, and a beforeunload warning if anything is still unsaved.
    Plus a manual Save, which is what makes autosave trustworthy.
  - Validation (§9): required fields, RSVP-before-event date consistency,
    24-hour time format, image requirements, and character limits sized to the
    printed card. Save-time validation is separate from completeness checking —
    collapsing them would make it impossible to autosave an unfinished draft.
  - Live preview (§10) for desktop, mobile, and print, from a pure view model
    that Ph5's website generator is intended to share.
  - Draft management (§11): create, inline rename, resume where you left off
    (stored on the row, so it works across devices), and delete with a confirm.
  - Approved design vocabulary (`lib/config/design-vocabulary.ts`) — colour
    themes, typography pairings, backgrounds, decorations, and section toggles.
    Personalization stores slugs from this list and nothing else, which is what
    makes §6's "within the approved design system" enforceable rather than
    aspirational.
  - `MediaAsset` and `services/media` — the seam Ph4's Media Library will own.
    Invitations reference assets by id, one asset can fill several slots, and
    deleting a referenced asset is refused.
  - "My Events" is now the real drafts list; Ph2's "Use this template" hands off
    into the builder via `/builder/new`.

### Changed

- `prisma/migrations/` gained `migration_lock.toml`, so migrations can now be
  generated incrementally rather than only from empty.

### Added

- Phase 2 — Template Marketplace.
  - Template catalog: categories as database rows (adding one is an INSERT, not
    a deploy — Ph2.md §1), curated collections with seasonal date windows,
    tiers, featured flags, and derived "New".
  - Search across name, description, designer, category, tags, colours, and
    styles (Ph2.md §3). Filters for event type, colour, style, orientation,
    price, recently added, and favourites (§4). Sorts for recommended, popular,
    newest, and alphabetical (§5).
  - Template cards and a preview page with desktop, mobile, and print previews,
    full metadata, and no editing affordance (§2, §6, §7).
  - Recommendation engine behind a strategy interface, so an AI implementation
    replaces one line rather than every caller (§8). Basic scorer weights event
    type, popularity (log-scaled), freshness, and facet affinity.
  - Favourites, recently viewed, and recently used (§9).
  - Pagination, lazy-loaded images with per-breakpoint sizes, and cached
    category/facet metadata (§10).
  - Generated placeholder artwork (`lib/placeholder-art.ts`) — deterministic
    SVG served with immutable caching. Scaffolding until ML Printing supplies
    real template imagery; media upload is out of scope for this phase.
  - `pnpm db:local` — a local Postgres via PGlite (WASM), so migrations, the
    seed, and every query can be run offline without Supabase credentials.
  - Seeded catalog: 8 categories, 2 collections, 20 templates (19 published,
    1 draft kept deliberately to prove the publication filter).

### Fixed

- `/templates/<unknown>` returned HTTP 200 while rendering "Page not found".
  `app/templates/loading.tsx` wrapped the whole subtree in a Suspense boundary,
  so Next flushed a 200 before the page's `notFound()` ran. Moving it into the
  `(catalog)` route group scopes it to the catalog and restores the 404. Caught
  by driving a real database, not by any unit test.

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
