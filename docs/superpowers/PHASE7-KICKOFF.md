# Phase 7 kickoff — read this first

Written at the end of the Phase 6 session, which had grown too large and was
failing mid-response. Everything a fresh session needs is here.

## Where the project stands

Phases 0–6 are complete, merged to `main`, and deployed.

- `main` @ `b898355`, local and remote in sync (`github.com/guinoome/mlprinting`).
- Live at **`mlprinting.vercel.app`** (NOT `ml-dep.vercel.app` — that 404s).
- Production Supabase schema is current: 5/5 migrations applied.
- Gates on `main`: lint, typecheck, **454 tests**, and build all exit 0.

Phase 6 (PDF generation) shipped: press-ready CMYK export, 3mm bleed, 5mm safe
margin, crop marks, 300 DPI images, embedded SIL OFL fonts, two-sided card,
pre-flight validation, append-only version history behind an ownership-checked
download route. See `docs/print-pipeline.md`.

## What Phase 7 is, and how it was decomposed

`raw/ML Digital Event Platform (ML-DEP) Ph7.md` — Booking, Order Management &
Production Workflow. 15 deliverables. It is too large for one spec, so it was
split into four sub-projects, each getting its own spec → plan → implementation
cycle:

| Sub-project | Covers | Depends on |
|---|---|---|
| 7a — Order core | Booking/Order model, 13-state lifecycle, audited transitions, order timeline | nothing |
| **7c — Internal production** | **Production dashboard, kanban queue, task assignment, internal notes, website/print status** | 7a |
| 7b — Customer experience | Customer order view, proof review, approval workflow, revision requests | 7a |
| 7d — Cross-cutting | Notifications, search & filtering, reporting foundation | 7a–7c |

**The user chose to start with 7c**, not 7a.

### The constraint that choice creates — do not lose this

7c cannot be built without *some* order model, so 7a's core will get built
underneath it. The risk is that the order model ends up shaped by whatever the
kanban board happened to need, and that shape is expensive to change once
customer-facing 7b is built on it.

Mitigation, and this should be an explicit part of the 7c design conversation:
design the minimal order core **deliberately**, as a named sub-piece of 7c's
spec, driven by the lifecycle in Ph7.md §2 — not accreted from screen needs.
Get the entity boundaries and the status enum right even where 7c does not yet
exercise them.

### Open modelling question to resolve first

Ph7.md uses "Booking" and "Order" almost interchangeably and never says whether
they are one entity or whether one booking can spawn several orders (e.g. a
wedding needing invitations *and* a website *and* a reprint). This is the most
consequential decision in the phase. Resolve it before writing any schema.

## Prerequisites that already exist — do not rebuild these

- `Role { ADMIN, STAFF, CUSTOMER }` enum, `Profile.role` defaulting to
  `CUSTOMER`, indexed. Phase 7 needs no new role model.
- `lib/config/routes.ts` already declares `routes.admin.*` including
  `bookings`, `production`, `customers`, `reports`, `settings`.
- Page shells already exist at `app/(dashboard)/admin/{bookings,production,
  customers,promotions,reports,settings,templates}/page.tsx` — Phase 1
  placeholders waiting for exactly this phase.
- Engines to integrate with, both done: `services/pdf/` (Phase 6) and
  `features/website-generator/` (Phase 5). Ph7.md §11 explicitly says the
  website module tracks *status only* — deployment automation is Phase 8.

## Project conventions a fresh session must know

- **Never run `prisma migrate dev`.** It is broken against this project's local
  PGlite database (P1017). Use `prisma migrate diff --from-schema-datasource
  --to-schema-datamodel --script` then `prisma migrate deploy`. On a fresh
  worktree run `migrate deploy` first to baseline, or the diff returns the whole
  schema instead of your delta.
- **`.env.local` `DATABASE_URL` points at PRODUCTION Supabase.** A local dev
  click-through writes real rows. Point at local PGlite (`pnpm db:local`) before
  any UI testing.
- Zero cross-feature imports. Features depend on services, never the reverse.
  Shared logic goes to `lib/` — see `lib/invitation/completeness.ts` and
  `lib/invitation/preview-model.ts`, both relocated for exactly this reason.
- `vitest.config.ts` aliases `server-only` to its `empty.js`; without it every
  server module is untestable. `.eslintrc.json` sets `root: true` so a worktree
  under `.worktrees/` does not load the parent repo's config.
- Workflow: `superpowers:brainstorming` → `writing-plans` →
  `subagent-driven-development` (or inline) → `finishing-a-development-branch`.
  Work in a git worktree under `.worktrees/`.
- End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Verify, don't assume.** Phase 6 shipped three defects that existed in its own
  plan; each was caught by running the thing rather than reading it. Also: never
  pipe `pnpm typecheck` into `tail` — it masks the exit code and a broken commit
  lands.

## Outstanding, not blocking

- **Phase 6 manual browser checks were never run**: generate a PDF through the
  UI, open it in a viewer (confirm 2 pages, crop marks outside trim, fonts
  "Embedded Subset"), and confirm a *signed-in* second customer gets 404 on
  another's `/api/pdf/<id>`. Only the anonymous 404 case was verified.
- `NEXT_PUBLIC_FEATURE_PDF_GENERATION=true` was added to local `.env.local`.
  Production already has it. Remove locally if you want it off there.
- **Two GitHub PATs were pasted into an earlier conversation and should be
  revoked.**
- Phase 5 follow-ups still open: React `cache()` for the double
  `getPublishedInvitation` fetch; DST edge in `zonedInstant`; `robots` is
  `index:false` even for published sites; the feature flag is not a full kill
  switch (QR/media/RSVP paths do not check it); `lib/env.ts` has no URL-format
  validation.

## How to start

Open a fresh session in `C:\dev\ml-dep` and say:

> Read `docs/superpowers/PHASE7-KICKOFF.md`, then brainstorm Phase 7c —
> internal production workflow.
