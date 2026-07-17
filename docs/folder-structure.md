# Folder structure

```
ML-DEP/
├── app/                    Next.js App Router — routing and pages
│   ├── globals.css         Design tokens + Tailwind layers
│   ├── layout.tsx          Root layout (theme script, Toaster)
│   ├── page.tsx            Landing page
│   ├── error.tsx           Route error boundary
│   ├── global-error.tsx    Root-layout error boundary
│   ├── not-found.tsx       404
│   ├── (auth)/             Login, register — chrome-free layout
│   ├── (dashboard)/        Customer + admin dashboards, behind auth
│   │   ├── dashboard/      Customer: events, orders, media, notifications, account
│   │   └── admin/          Staff: bookings, templates, production, customers,
│   │                       promotions, reports, settings
│   ├── templates/          Template Marketplace — public (Ph2)
│   │   ├── (catalog)/      Catalog + its loading.tsx (see the file for why the
│   │   │                   route group exists — it is load-bearing)
│   │   └── [slug]/         Template preview
│   └── api/placeholder/    Generated placeholder artwork
│
├── components/             Shared UI, no business logic
│   ├── ui/                 Design-system primitives (Button, Card, Toast, …)
│   ├── nav/                App shell, sidebar, mobile drawer, user menu
│   ├── page-header.tsx     Standard page heading + breadcrumbs
│   ├── placeholder-module.tsx  A section awaiting its phase
│   ├── setup-notice.tsx    Inline "not configured" banner
│   └── configuration-required.tsx  Full-page "not configured" state
│
├── features/               Domain modules — one per business capability
│   ├── auth/               Login, register, logout, password change
│   ├── account/            Profile, avatar, preferences
│   └── template-marketplace/  Catalog: criteria, query, repository, actions (Ph2)
│
├── services/               Shared capabilities features call
│   ├── upload/             File upload framework (Ph4's Media Library reuses it)
│   └── recommendations/    Strategy interface + basic scorer (Ph2 §8)
│
├── scripts/local-db.ts     Local Postgres (PGlite) — pnpm db:local
│
├── lib/                    Framework-agnostic utilities
│   ├── auth/               Roles, protected-route registry, session reading
│   ├── config/             Branding, routes, feature flags, navigation registry
│   ├── notifications/      Notification store (framework-free)
│   ├── hooks/              React bindings (use-toast)
│   ├── supabase/           Auth clients (browser, server, middleware)
│   ├── db.ts               Prisma client singleton (lazy)
│   ├── env.ts              Environment variable access
│   ├── logger.ts           Structured logging + error-report seam
│   ├── theme.ts            Theme resolution + no-flash init script
│   └── utils.ts            cn(), initialsFrom(), formatBytes()
│
├── prisma/schema.prisma    Database schema
├── docs/                   Engineering documentation (this folder)
├── raw/                    Product specifications — authoritative for scope
├── e2e/                    Playwright end-to-end tests
├── .github/workflows/      CI
└── middleware.ts           Session refresh + route protection
```

## What goes where

**`app/`** — routing only. A page composes a feature and renders it. When a page
file starts holding business logic, that logic belongs in `features/`.

**`components/ui/`** — primitives with no knowledge of the domain. A `Button`
belongs here; an `InvitationCard` does not (that's `features/`). The test: could
this component drop into an unrelated product unchanged?

**`features/`** — one folder per capability, each self-contained with its own
components, schema, and actions. Current occupants: `auth`, `account`,
`template-marketplace`. Future: `invitation-builder` (Ph3), `media-library`
(Ph4), `booking` (Ph7), `payment` (Ph8).

A feature may use `components/`, `services/`, and `lib/`. It may **not** import
another feature — put shared logic in `services/` instead.

> One exception exists today, and it is a debt, not a pattern: `features/account`
> imports form primitives and the `ActionState` type from `features/auth`. When a
> third feature needs them, they move to `components/` and `lib/` rather than
> growing a second cross-feature import.

**`services/`** — capabilities multiple features need: uploads (Ph1), media
storage (Ph4), PDF generation (Ph6), deployment (Ph8). Services expose
interfaces; features depend on services and never the reverse (Ph4.md §15).

**`lib/`** — utilities with no app dependencies. If it could be published as a
standalone package, it belongs here.

**`raw/`** — the product specs. Read-only from code's perspective, and
authoritative when code and spec disagree (V1 doc §10: stop, explain, ask — do
not guess).

## Conventions

- Import alias `@/` maps to the repo root: `import { cn } from "@/lib/utils"`.
- Unit tests sit beside their subject: `lib/utils.ts` → `lib/utils.test.ts`.
- Files are named for what they export; folders are lowercase and hyphenated.
- Modules that read the database or session import `server-only`, so importing
  them from a Client Component fails the build instead of leaking at runtime.
- Empty-by-design folders carry a `README.md` explaining the boundary, so the
  intent survives even if someone starts filling them in.
