# Development workflow

## Setup

**Prerequisites:** Node 20+, pnpm, git.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`pnpm dev` starts without `.env.local` — the landing page renders and middleware
passes requests through. Anything touching auth or the database needs real
values.

### Filling in `.env.local`

Requires a Supabase project. Create one at <https://supabase.com> (free tier),
then:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI) |

`NEXT_PUBLIC_*` variables reach the browser — never put a secret behind that
prefix. The `service_role` key bypasses row-level security entirely; it is
server-only and must never appear in client code.

`.env.local` is gitignored. Keep it that way.

### Database

```bash
pnpm prisma:generate            # regenerate client after schema edits
pnpm prisma:migrate             # create + apply a dev migration
```

## Daily loop

```bash
pnpm dev            # work
pnpm lint           # before committing
pnpm typecheck
pnpm test
```

## Branching

`main` is always deployable (V1 doc §9). Work happens on branches:

```
feat/<short-description>     new capability
fix/<short-description>      bug fix
docs/<short-description>     documentation
chore/<short-description>    tooling, deps
```

## Commits

Small and descriptive (V1 doc §9). Large unreviewable commits are the thing to
avoid; a commit should be one coherent change with a subject line that says what
changed and why.

## Definition of Done

A milestone is complete only when (V1 doc §15):

- [ ] Requirements satisfied
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Responsive behaviour verified
- [ ] Tests completed, where applicable
- [ ] Security considered
- [ ] Performance acceptable
- [ ] Repository deployable
- [ ] No unnecessary technical debt introduced

"Documentation updated" is not a formality — the repository is the project's
technical memory (V1 doc §13). Changes to architecture, module boundaries,
folder structure, APIs, or workflows update the docs in the same commit. A
future collaborator should understand the system without access to any prior
conversation.

## Scope discipline

`raw/` holds the authoritative specs. When code and spec disagree, or a request
falls outside the current phase: **stop, explain, ask** (V1 doc §10). Do not
guess, and do not quietly widen scope.

Each phase has an explicit *Out of Scope* list. Those lists are load-bearing —
they exist to keep the foundation finishable.

## Cost

Prefer free and open-source tooling (V1 doc §11). Introducing a paid service
needs explicit approval, an explanation of why, a free alternative considered,
and a recommendation on whether to adopt now or after revenue.
