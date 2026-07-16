# Folder structure

```
ML-DEP/
├── app/                    Next.js App Router — routing and pages
│   ├── globals.css         Design tokens + Tailwind layers
│   ├── layout.tsx          Root layout
│   └── page.tsx            Landing page
│
├── components/             Shared UI, no business logic
│   └── ui/                 Design-system primitives (Button, …)
│
├── features/               Domain modules — one per business capability
│                           (empty in Phase 0 by design)
│
├── services/               Shared capabilities features call
│                           (empty in Phase 0 by design)
│
├── lib/                    Framework-agnostic utilities
│   ├── auth/roles.ts       Role constants + protected-route registry
│   ├── supabase/           Auth clients (browser, server, middleware)
│   ├── db.ts               Prisma client singleton
│   ├── env.ts              Environment variable access
│   └── utils.ts            cn() class merger
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
components, hooks, and logic. Future occupants: `template-marketplace` (Ph2),
`invitation-builder` (Ph3), `media-library` (Ph4), `booking` (Ph7),
`payment` (Ph8).

A feature may use `components/`, `services/`, and `lib/`. It may **not** import
another feature — put shared logic in `services/` instead.

**`services/`** — capabilities multiple features need: media storage (Ph4), PDF
generation (Ph6), deployment (Ph8). Services expose interfaces; features depend
on services and never the reverse (Ph4.md §15).

**`lib/`** — utilities with no app dependencies. If it could be published as a
standalone package, it belongs here.

**`raw/`** — the product specs. Read-only from code's perspective, and
authoritative when code and spec disagree (V1 doc §10: stop, explain, ask — do
not guess).

## Conventions

- Import alias `@/` maps to the repo root: `import { cn } from "@/lib/utils"`.
- Unit tests sit beside their subject: `lib/utils.ts` → `lib/utils.test.ts`.
- Files are named for what they export; folders are lowercase and hyphenated.
- Empty-by-design folders carry a `README.md` explaining the boundary, so the
  intent survives even if someone starts filling them in.
