# ML Digital Event Platform (ML-DEP)
## Phase 0 — Technical Stack Specification

**Status:** Approved by user 2026-07-17. Spec only — no implementation until separate explicit go-ahead.

**Relation to other docs:** `ML Digital Event Suite (ML-DES).md` defines Phase 0's *requirements* (repo init, deployment pipeline, UI foundation, auth scaffold, etc.). This doc defines the *how* — the concrete stack chosen to satisfy those requirements. Read both together.

---

## 1. Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Deploy target is already Vercel (per `PROJECT_CHARTER.md`); native SSR/SSG covers both internal dashboards and later customer-generated event sites (Phase 5) |
| Styling | Tailwind CSS + shadcn/ui | Free, matches "reusable component library" and "Beautiful by Default" principles (V1 doc §7) |
| Database | Postgres via Supabase (free tier) | Bundles DB + Auth + file storage under one free service — storage reused later by Phase 4 (Media Library), auth reused by Phase 1 |
| ORM | Prisma | Matches available tooling in dev environment |
| Package manager | pnpm | Faster installs, disk-efficient, free |
| Lint/Format | ESLint + Prettier | Standard, free |
| Testing | Vitest (unit) + Playwright (e2e) | Free, standard for Next.js |
| Auth | Supabase Auth | Bundled with DB choice, avoids a second paid/free service to wire up separately |

All choices free-tier / open-source, per V1 doc §11 Cost Awareness. No paid services introduced in this phase.

---

## 2. Repository

- Reuse existing GitHub repo: `https://github.com/guinoome/mlprinting` (per `PROJECT_CHARTER.md`) — do not create a new repo.
- Local repo currently does not exist (`git init` required as part of Phase 0 build).

### Folder structure

```
app/            route handlers (Next.js App Router)
components/     shared UI (design system primitives)
features/       domain modules (feature-based organization)
services/       reusable service layer (media, auth, etc.)
lib/            utilities, shared helpers
docs/           architecture, folder structure, workflow docs
```

---

## 3. Deployment Pipeline (Phase 0 scope only)

Per `ML-DES.md` deliverable #5: prepared, not live.

```
GitHub repo (mlprinting)
        │
        ▼
Vercel project linked
        │
        ▼
Env vars configured
        │
        ▼
Build verified on push
        │
        ▼
(NOT made public/live yet)
```

Note: this is distinct from the Phase 8 **live per-order deployment pipeline** (`Ph8.md`), which triggers automatically per approved customer order once Website Generator (Phase 5), PDF Generator (Phase 6), Booking (Phase 7), and Payment (Phase 8) exist. Phase 0's pipeline only proves the wiring works.

---

## 4. Auth Scaffold (Phase 0 scope only)

- Supabase Auth wired in.
- Roles table: `Admin`, `Staff`, `Customer` (per `ML-DES.md` + `Ph1.md`).
- Protected route middleware structure in place.
- **No permission logic, no login UI business rules yet** — structure only, per Phase 0 constraints.

---

## 5. Out of Scope (this doc, same as `ML-DES.md`)

Do NOT build in this phase: Invitation Builder, Marketplace, Payment, PDF Generator, RSVP, QR, Gallery, Marketing features.

---

## 6. Known Gaps Surfaced During This Review

- `ML Digital Event Platform (ML-DEP) Ph5.md` is an empty file (0 bytes). Sequence implies this should be the **Website Generator** phase spec — currently undocumented. Needs to be written before Phase 5 work begins.
- Google Forms invitation autofill: not present in any existing phase doc. Proposed fit: extend Phase 3 (Guided Invitation Builder) as an alternate intake path. Needs its own design pass when we reach Phase 3.
- GCash / QR Ph "auto" payment verification: conflicts with `Ph8.md` MVP scope, which specifies **manual** verification (customer uploads receipt, staff approves). Real gateway auto-verification is listed "Future-ready," not MVP, and would introduce a paid service requiring separate approval under V1 doc §11. Needs a decision when we reach Phase 8.
- QR-scan check-in: overrides V1 doc §5 non-goal (user-approved 2026-07-17). Not yet owned by any phase doc — nearest fit is Phase 3 (RSVP) or Phase 7 (booking). Needs its own design pass.

---

## 7. Next Step

Per `superpowers:brainstorming` process: invoke `writing-plans` skill to turn this spec into a step-by-step implementation plan for Phase 0. No code is written until that plan is also reviewed and approved.
