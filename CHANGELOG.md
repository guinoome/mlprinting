# Changelog

All notable changes to ML-DEP are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0, the minor version tracks the completed phase: `0.1.0` = Phase 0 done,
`0.2.0` = Phase 1 done, and so on. `1.0.0` is the MVP launch at the end of
Phase 10.

## [Unreleased]

### Added

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
