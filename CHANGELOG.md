# Changelog

All notable changes to ML-DEP are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0, the minor version tracks the completed phase: `0.1.0` = Phase 0 done,
`0.2.0` = Phase 1 done, and so on. `1.0.0` is the MVP launch at the end of
Phase 10.

## [Unreleased]

### Added

- Phase 7d — Order Search, Reporting and Notifications.
  - Staff can search bookings by reference, customer or status at
    `/admin/bookings`; the filter lives in the URL, so a view is shareable.
  - `/admin/reports` shows the operational snapshot — active bookings, pending
    approvals, production workload, completed orders, and a per-status
    breakdown — from two grouped counts rather than a table scan.
  - `/dashboard/notifications` surfaces a "needs your attention" feed derived
    from the customer's own orders. No new tables: search and reporting are
    query-only, and notifications are derived, so the whole sub-project ships
    without a migration.

- Phase 7b — Customer Order Experience.
  - `/dashboard/orders` lists a customer's own orders; `/dashboard/orders/[id]`
    shows each deliverable's progress and its proof — the print PDF or the live
    website.
  - For an item awaiting review, the customer can approve it (locking it for
    production) or request changes with a description; the request is recorded
    in the order's audit trail as a numbered revision.
  - Every read and action is scoped to the signed-in customer through the
    order's owner; no new tables — revisions ride the existing event trail.

- Phase 7c — Internal Production Workflow.
  - `Order` and `OrderItem`: one commercial engagement with any number of
    deliverables, so a reprint or a later website is not a duplicated order.
  - A kanban board at `/admin/production` covering every in-flight deliverable,
    with assignment, priority and due dates; `/admin/bookings` lists orders.
  - Status transitions are enforced from a table and audited: every change
    writes an `OrderEvent` in the same transaction, and an order's status
    follows its items without anyone maintaining it by hand.
  - Human-facing booking references, `ML-2026-0042`, sequenced per year from
    the highest existing reference rather than a row count.
  - All internal surfaces are staff-only and return 404 rather than redirect,
    enforced in Server Actions as well as page loads.

- Phase 6 — PDF Generation.
  - Press-ready PDF export of an invitation: true CMYK throughout, 3 mm bleed,
    5 mm safe margin, crop marks, 300 DPI images, embedded fonts. Available at
    `/dashboard/events/<id>/print` behind `NEXT_PUBLIC_FEATURE_PDF_GENERATION`.
  - Two-sided card — event details on the front, names and practical details on
    the back. When every back section is hidden or empty the document is a
    single page: a blank back costs money at the press and reads as a mistake.
  - Pre-flight validation blocks generation on missing required fields, text
    that will not fit at the chosen size, an unmapped typography, and photos
    under 200 DPI at their placed size; 200–300 DPI warns but proceeds.
  - Version history — every generated file is kept and stays downloadable.
    `PdfGeneration` rows are append-only and record the generator version, the
    template version at generation time, and the validation report.
  - Files are stored in the private `media` bucket and served only through an
    ownership-checked route; a print file has no public audience.
  - Colour is authored per theme in `lib/config/design-vocabulary.ts` rather
    than converted from hex — an uncalibrated conversion is a guess that only
    reveals itself once the job is printed. Neutral dark text is K-only.

### Changed

- Print typefaces are Crimson Text, Lato, Spectral and Great Vibes (all SIL
  OFL, committed under `assets/fonts/`), replacing the vocabulary's previous
  system fonts, which cannot legally be embedded in a distributed PDF. The
  on-screen preview stacks now lead with the same families, so the preview and
  the printed card are set in one typeface.
- `completeness.ts` moved from `features/invitation-builder/` to
  `lib/invitation/` so print and the builder can share it without a
  feature-to-feature import.
- `vitest.config.ts` aliases `server-only` to its `empty.js`, and
  `.eslintrc.json` sets `root: true` so a nested git worktree does not load the
  parent repository's config.

- Phase 5 — Website Generator.
  - A public, guest-facing event website at a customer-chosen web address
    (`/e/<slug>`) — no account needed to view it. Publish state
    (`Invitation.isPublished`) is the actual access boundary; the slug is
    memorable, not a security token.
  - The same view-model contract Phase 3 built for the in-app preview
    (`toPreviewModel`) now renders the real site too — relocated to
    `lib/invitation/` so a second feature could use it without a cross-feature
    import, rather than duplicating the resolution logic.
  - RSVP (§3): guests respond without an account; the customer sees every
    response on a new dashboard page.
  - Countdown, a Google Maps link per venue, a full gallery, and a QR code for
    the published URL — all derived from data the Ph1-4 schema already has, no
    new invitation-content fields.
  - Ph4's media-serving route now serves a photo to an anonymous guest when it
    belongs to a currently published invitation, alongside its existing
    session-ownership check — one route, one set of storage objects, for both
    the dashboard and the public site.
- Phase 4 — Invitation Media Library.
  - Computed virtual folders (Ph4.md §2, §9): assets group "By Event" and "By
    Type" as read-time views over the existing asset pool and usage join —
    never a stored folder table, since one photo may belong to many events.
  - Replace Asset (§10): same id, new bytes, an incrementing `version` field —
    every existing reference updates automatically, with no version history
    kept.
  - A real Upload Manager (§3): drag-and-drop, multi-file, per-file progress,
    retry, and cancel — the one place in the app that uses a Route Handler
    instead of a Server Action, because Server Actions cannot expose
    upload-progress events.
  - Image processing (§5): `sharp`-generated thumbnail and preview variants at
    upload time, re-encoded to WebP (which strips EXIF/GPS metadata as a side
    effect), served through an authenticated proxy route
    (`/api/media/[assetId]/[version]/[variant]`) with safe immutable caching —
    never a rotating Supabase signed URL. Degrades to the original alone when
    a file (e.g. some HEIC images) can't be decoded.
  - Search (§8) and a storage quota summary (§12), following the same
    criteria/query pattern Phase 2's marketplace established.
  - The Guided Invitation Builder's media step now browses the full library
    (Ph3.md §7's "Connect to the Invitation Media Library"), replacing the
    flat per-invitation list Phase 3 shipped as a placeholder.
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
