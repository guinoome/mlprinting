# Architecture

**Status:** Phase 1. Describes the foundation as built plus the boundaries later
phases must respect. Update this doc whenever module boundaries or data flow
change (V1 doc §13, Repository Memory).

---

## The core idea

One structured dataset produces two products.

```
                Guided Invitation Builder (Phase 3)
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Invitation data     │  ← structured, presentation-free
                  │   (the source of      │
                  │    truth)             │
                  └───────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    Website Generator (Ph5)         PDF Generator (Ph6)
              │                               │
              ▼                               ▼
      Live event website              Press-ready print file
```

This is the *Design Once, Deliver Everywhere* principle (V1 doc §7), and it is
the single most important constraint in the codebase: **invitation data must
never carry presentation details**. A colour, font, or page coordinate stored on
the event record couples the website and the print output together, and the two
have irreconcilable layout needs. Presentation belongs to templates and themes.

The parallel rule for assets is *Capture Once, Reuse Everywhere* (Ph4.md): a
customer uploads a photo once, and the Media Library is the only owner of it.
Both generators reference assets by id; neither copies bytes.

---

## Layers

```
app/         Routing, layouts, pages. Thin — composition only.
   │
features/    Domain modules. One folder per business capability.
   │
services/    Shared capabilities features call (media, PDF, deploy).
   │
lib/         Framework-agnostic utilities. Depends on nothing above it.
```

Dependencies point downward only:

- `app/` may import from `features/`, `components/`, `services/`, `lib/`.
- `features/` may import from `components/`, `services/`, `lib/` — **never from
  another feature**. Two features needing the same logic means it belongs in
  `services/`.
- `services/` may import from `lib/` only. A service never imports a feature —
  Ph4.md §15 states this explicitly for the Media Library, and it generalizes:
  services are depended upon, they do not depend.
- `lib/` imports nothing from the app.

Why the no-cross-feature rule matters: the marketplace, builder, media library,
booking, and payment modules are each substantial. Direct imports between them
produce a graph where changing one breaks four others, and the codebase stops
being separable long before the MVP is finished.

---

## Data

**Postgres via Supabase**, accessed through **Prisma**.

Auth identities live in Supabase's `auth.users`, which Prisma does not manage.
`Profile` mirrors it by id and holds what Supabase Auth has no concept of —
role, display name, avatar. The two are joined by uuid, never merged.

Phase 1 defines `Profile`, `Preference`, and the `Role`/`ThemePreference` enums.
Business models arrive with their phases: `Event`/`Invitation` (Phase 3),
`MediaAsset` (Phase 4), `Template` (Phase 2), `Booking`/`Order` (Phase 7),
`Payment`/`Deployment` (Phase 8).

`Profile` rows are reconciled on first authenticated request rather than created
at signup (`lib/auth/session.ts`). A user exists the moment they confirm their
email — an event that happens outside this app — so a signup-time insert would
need a database trigger backing it up, and then two code paths would own the
same row and drift.

The Prisma client is constructed lazily (`lib/db.ts`). Instantiating it at module
load throws without `DATABASE_URL`, which would mean any page importing it breaks
the secret-less CI build.

---

## Auth

Supabase Auth, with sessions in cookies.

```
Request → middleware.ts → updateSession()
                              │
                    refresh session (getUser)
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          protected route?           public route
                 │                         │
         no user → /login            continue
```

Two decisions worth keeping:

- Middleware calls `getUser()`, not `getSession()`. `getSession()` reads the
  cookie without verifying it against Supabase, so it can be spoofed. In
  middleware — the thing guarding every protected route — that distinction is
  the whole point.
- The protected-route list lives in `lib/auth/roles.ts`, not scattered across
  route files. Adding a protected area later means adding one string.

Phase 1 registers `/dashboard` and `/admin`.

**Two gates, two places, on purpose.** The middleware proves *who* you are; it
cannot decide *what* you may see, because the role is a Postgres column and
middleware runs on the edge without Prisma. So:

| Gate | Where | Question |
|---|---|---|
| Session | `middleware.ts` → `lib/supabase/middleware.ts` | Are you signed in? |
| Role | `app/(dashboard)/admin/layout.tsx` | Are you staff? |

The layouts re-check the session even though middleware already did. That is not
redundancy — a matcher gap or a config change silently disables middleware, and a
layout that assumes "something upstream checked" is how a dashboard renders to
nobody. Authorisation belongs next to the data it protects.

Authenticated routes are pinned `force-dynamic`. Without it, a build with no env
vars prerenders them: `getUser()` returns before touching cookies, Next sees
nothing dynamic, and the dashboard becomes static HTML served to everyone.

Per Ph1.md §4 there is still no permission system — roles gate whole route trees
and nothing finer. Resist adding per-action permissions until a phase asks.

---

## Design system

Tokens are CSS custom properties in `app/globals.css`, surfaced to Tailwind as
semantic names (`bg-primary`, `text-muted-foreground`) in `tailwind.config.ts`.

Components reference semantic tokens, never raw values. Rebranding then changes
the token layer only — no component edits. The current palette is a neutral
placeholder pending ML Printing's brand colours; because components never name a
colour, swapping it is a one-file change.

Variants use `class-variance-authority` (see `components/ui/button.tsx`). Extend
a component's variants rather than forking it.

Interactive primitives are built on Radix (dropdown, dialog, toast, switch,
avatar, label). The reason is accessibility behaviour that is tedious to
hand-roll and easy to half-finish: focus trapping, focus restoration, live-region
announcement, Escape handling, scroll lock.

---

## Cross-cutting frameworks

Phase 1 delivers four seams later phases plug into rather than reinvent:

| Framework | Lives in | Consumed by |
|---|---|---|
| Configuration (Ph1 §10) | `lib/config/` | Everything — branding, routes, flags, nav |
| Logging (Ph1 §9) | `lib/logger.ts` | Any `catch`; one `report()` seam for a future service |
| Notifications (Ph1 §7) | `lib/notifications/`, `components/ui/toast*` | Any client interaction |
| Uploads (Ph1 §8) | `services/upload/` | Ph4 Media Library, Ph1 avatars |

Two shapes worth keeping:

- **The notification store is framework-free.** `notify()` is a plain module
  function, not a hook, because the most common caller is a `catch` block in an
  event handler where hook rules do not apply. React binds to it through
  `useSyncExternalStore`.
- **Feature flags are getters, not constants.** They read `process.env` at call
  time, so a flag cannot be frozen into a module at import. Every business
  capability ships dark and is gated to its phase — that is what lets Phases 2–10
  land incrementally instead of in one unreviewable drop.

The logger redacts credential-shaped keys before writing. Logs travel to places
credentials must not: consoles, aggregators, support tickets.

---

## Deployment

Two distinct pipelines, easily confused:

**Platform deployment** (this repo, wired in Phase 0): push to GitHub → Vercel
builds and deploys ML-DEP itself.

**Per-order website deployment** (Phase 8, not built): an approved customer
order triggers the Website Generator, which commits the generated site and
deploys it. This one is a runtime feature of the product and depends on Phases
5–8 existing.

Phase 0 delivers the first, and only proves the wiring works — the site is not
made public (ML-DES.md §5).

---

## Testing

Vitest for unit tests, colocated (`lib/utils.test.ts` beside `lib/utils.ts`).
Playwright for end-to-end flows, in `e2e/`.

Phase 1 has 81 unit tests, concentrated where a mistake is expensive and a test
is cheap: redirect sanitisation, upload validation, route matching, credential
redaction. Components are not unit-tested — their behaviour is Radix's, already
tested upstream, and asserting that a div has a class tests the test.

`e2e/` still holds config only. Phase 1's flows are worth driving end to end, but
they need a seeded Supabase project to sign into; that lands with the deployment
gates in `docs/deployment-workflow.md`.

---

## Known gaps

Carried from `Phase0-TechStack-Spec.md` §6 — open questions that need decisions
before the phases they affect:

- **`raw/…Ph5.md` is empty (0 bytes).** Sequence implies Website Generator.
  Must be written before Phase 5 starts.
- **Google Forms invitation autofill** — approved by the user, but absent from
  every phase doc. Proposed fit: an alternate intake path into Phase 3's
  builder. Needs a design pass.
- **GCash / QR Ph automatic payment verification** — conflicts with Ph8.md,
  which scopes MVP payment as *manual* verification (customer uploads a receipt,
  staff approves). Gateway auto-verification is "Future-ready" there and would
  introduce a paid service, requiring approval under V1 doc §11. Needs a
  decision at Phase 8.
- **QR-scan check-in** — user-approved override of the V1 §5 non-goal, but no
  phase doc owns it. Nearest fit: Phase 3 (RSVP) or Phase 7 (booking).

Raised in Phase 1:

- **Storage buckets are referenced but not provisioned.** `services/upload`
  writes to `avatars` (public) and `media` (private). Both must be created in
  Supabase with row-level security policies scoping writes to
  `<userId>/…` before uploads work — the path convention is enforced in code
  today, and code is not an access policy. See `docs/deployment-workflow.md`.
- **Email change has no flow.** Deliberately excluded from the account form
  (`features/account/schema.ts`): it is an identity change needing confirmation
  to both the old and new address, and treating it as an ordinary field is how an
  account is lost to a typo. Needs its own design.
- **No error-tracking service.** `logger.report()` is the seam; nothing consumes
  it. Choosing a service is a paid-tool decision under V1 §11.
- **Brand palette still placeholder.** Unblocked whenever ML Printing provides
  colours — one file, `app/globals.css`.
