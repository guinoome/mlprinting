# Contributing

## Before you start

Read [docs/development-workflow.md](docs/development-workflow.md) for setup, and
[docs/architecture.md](docs/architecture.md) for the module boundaries.

The product specs in [`raw/`](raw/) are authoritative. Each phase doc has an
*Out of Scope* list — those lists are deliberate, and building past them is how
the foundation stops being finishable.

## Making a change

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`, or `chore/…`.
2. Make the change. Keep commits small and descriptive (V1 doc §9).
3. Run `pnpm lint && pnpm typecheck && pnpm test` before pushing.
4. Update documentation in the same commit if you changed architecture, module
   boundaries, folder structure, APIs, or workflows (V1 doc §13).
5. Open a pull request. CI must be green — `main` stays deployable.

## Rules that matter

**Respect the dependency direction.** `app/` → `features/` → `services/` →
`lib/`. Features never import other features; services never import features.
Shared logic between two features belongs in `services/`.

**Invitation data carries no presentation.** No colours, fonts, or coordinates
on event records. The website and the print output have irreconcilable layout
needs, and coupling them through the data model is the one mistake this
architecture exists to prevent.

**Assets have one owner.** Reference media by id through the Media Library.
Never copy asset bytes into a feature.

**Components use semantic tokens.** `bg-primary`, not `bg-[#1a1a1a]`. The brand
palette is not final; components must not need editing when it lands.

**Secrets stay out of git.** Never commit `.env.local`. Never put a secret
behind `NEXT_PUBLIC_`.

## When something conflicts

If code and spec disagree, or a request falls outside the current phase: stop,
explain, and ask (V1 doc §10). Do not guess.

## Paid services

Default to free and open source (V1 doc §11). Proposing a paid dependency
requires explaining why, naming a free alternative, and saying whether it should
be adopted now or after revenue.
