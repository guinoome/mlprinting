# ML Digital Event Platform (ML-DEP)

Premium event websites and matching printed invitations, for **ML Printing**
(Libo, Tayud, Consolacion, Cebu).

Customers pick a template, complete a guided interview about their event, and
the platform generates both a live event website and a press-ready printed
invitation from that one dataset.

**Status:** Phase 0 — engineering foundation. No business features yet.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000
```

Requires Node 20+ and pnpm. `pnpm dev` runs without `.env.local`, but anything
touching auth or the database needs it — see
[docs/development-workflow.md](docs/development-workflow.md).

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm format` | Prettier write |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm prisma:generate` | Regenerate the Prisma client |
| `pnpm prisma:migrate` | Create and apply a dev migration |

## Stack

Next.js 14 (App Router) + TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Storage) · Prisma · Vitest + Playwright · deployed on Vercel.

Every choice is free-tier or open source, per the Cost Awareness constraint in
`raw/ML Digital Event Platform (ML-DEP) V1.md` §11. Rationale for each:
[Phase0-TechStack-Spec](<raw/ML Digital Event Platform (ML-DEP) Phase0-TechStack-Spec.md>).

## Documentation

| Doc | What's in it |
|---|---|
| [Architecture](docs/architecture.md) | System shape, module boundaries, data flow |
| [Folder structure](docs/folder-structure.md) | What belongs where, and why |
| [Development workflow](docs/development-workflow.md) | Local setup, branching, commits, Definition of Done |
| [Deployment workflow](docs/deployment-workflow.md) | GitHub → Vercel, env vars, rollback |
| [CHANGELOG](CHANGELOG.md) | Release history |

Product specs live in [`raw/`](raw/) and are the authoritative source for scope.
Phase docs `Ph1.md`–`Ph10.md` define what gets built and in what order.

## Repository

Authoritative remote: <https://github.com/guinoome/mlprinting>

## License

Proprietary — © ML Printing. All rights reserved.
