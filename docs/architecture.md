# Architecture

**Status:** Phase 0. Describes the foundation as built plus the boundaries later
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

Phase 0 defines `Profile` and the `Role` enum only. Business models arrive with
their phases: `Event`/`Invitation` (Phase 3), `MediaAsset` (Phase 4),
`Template` (Phase 2), `Booking`/`Order` (Phase 7), `Payment`/`Deployment`
(Phase 8).

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

Phase 0 registers no protected routes and implements no permission logic —
structure only, per ML-DES.md §7 and Ph1.md §4.

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

Phase 0 has no user flows to drive, so `e2e/` holds config only. Tests arrive
alongside the features they cover.

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
