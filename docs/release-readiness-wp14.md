# ML-DEP Release Readiness — WP-14

**Prepared:** 2026-08-31
**Scope:** Work packages WP-01 through WP-14 in the transferred ML-DEP checkout.

## Release decision

The implementation is code-complete and locally validated. It is ready for a controlled preview deployment, but it must not be described as production-deployed until the external Supabase, storage, provider, and Vercel checks below have passed.

## Verified local evidence

- Prisma Client generation passed.
- All 15 migrations applied in order to a fresh disposable PostgreSQL-compatible PGlite database.
- `prisma migrate status` reported the schema up to date.
- The explicit seed command completed with 16 categories, 2 collections, and 51 templates, including 50 published templates.
- TypeScript `--noEmit` passed.
- Next.js lint passed.
- Vitest passed: 72 test files and 763 tests.
- The production build passed cleanly with a database connection configured for pooled/prepared-statement-safe validation.
- The build generated 31 static pages.
- The implementation checkout and transferred ML-DEP folder were reconciled by SHA-256 comparison.
- The disposable validation database was stopped and removed after validation.

## Required release configuration

- Set `NEXT_PUBLIC_APP_URL` to the canonical deployment URL.
- Set `RATE_LIMIT_SECRET` to a securely generated secret of at least 32 characters. The rate limiter intentionally fails closed when it is absent or invalid.
- Confirm all existing Supabase, storage, authentication, email, payment, and remaster provider variables for the target environment.
- Keep feature flags conservative until each associated production dependency is verified.

## Controlled deployment sequence

1. Record the current production commit and Vercel deployment identifier.
2. Create and verify a Supabase database backup.
3. Review the 15-migration chain and apply outstanding additive migrations in order.
4. Deploy to a Vercel preview environment.
5. Run the smoke matrix below against preview.
6. Verify Supabase row-level security, private bucket policies, signed URLs, and service-role boundaries.
7. Verify provider webhooks/signatures and test-mode delivery for email, payment, and remaster integrations.
8. Promote the verified preview build to production.
9. Repeat the critical public, authenticated, payment, publishing, and storage smoke paths in production.
10. Record deployment evidence and any deviations in the release log.

## Smoke matrix

- Homepage, canonical metadata, robots.txt, and sitemap
- Catalogue browsing, recommendation flow, and full-catalogue route
- Invitation builder, live preview, Original/Remaster selection, and media library
- Public invitation rendering and countdown hydration
- RSVP submission, dashboard intelligence, filtering, and export
- Authenticated dashboard and authorization boundaries
- Memory settings, signed upload, moderation, privacy, and approved-only live wall
- Order creation, item lifecycle, delivery readiness, and PDF generation
- Payment capture/waiver controls and verified status transitions
- Controlled publish, slug conflict handling, and reversible unpublish
- Lifecycle notification planning, claims, opt-outs, and in-app rendering
- Upload rejection for spoofed or unsupported file signatures
- Rate-limit enforcement and recovery after the configured window

## Rollback and recovery

- Application rollback: redeploy the previously recorded Vercel deployment or commit.
- Schema rollback: do not run destructive down migrations in production. The new migrations are additive; retain their tables and columns while rolling application code back.
- Publication rollback: unpublish affected invitations through the reversible publication control.
- Experience rollback: disable interactive experiences with the existing feature flag.
- Capability isolation: disable website generation, PDF generation, booking, payments, or other affected capabilities with their existing feature flags where applicable.
- Data recovery: restore from the verified Supabase backup only after incident triage confirms that application rollback and targeted repair are insufficient.

## Production checks not performed here

This local validation did not:

- create a branch, commit, pull request, or remote push;
- apply migrations to the production Supabase project;
- create or promote a Vercel deployment;
- execute production smoke tests;
- inspect live storage buckets or production RLS policies;
- send real email, payment, or remaster-provider traffic.

Those are controlled release operations requiring the target accounts, credentials, and deployment authority.
