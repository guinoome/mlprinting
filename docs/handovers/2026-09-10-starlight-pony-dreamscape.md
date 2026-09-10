# ML-DEP Starlight Pony Dreamscape handover

**Recorded:** 2026-09-10, Asia/Taipei

**Authoritative Git repository:** `C:\Users\FraNc!s\Documents\ML Projects\ML Digital Event Platform (ML-DEP)`

**Active worktree:** `C:\codex-work\ml-dep-starlight`

**Branch:** `codex/starlight-pony-dreamscape`

**Base:** `fdcbc95955f91598cb55e665f431c5d7bf7cb783` (`origin/main` when work began)

**Production:** `https://mlprinting.vercel.app`

## Completed before this milestone — do not rework

- Capiz Window, Neon Eighteen, Fiesta Banderitas, Product Launch, Ivory Lace,
  Blush Botanical, and Midnight Gold are already live.
- The mobile marketplace overhaul, contrast follow-up, and private manual
  receipt verification are already live.
- Automatic PayMongo GCash, Maya, and QRPh remain gated on production
  credentials, signed webhook verification, and end-to-end transactions.
- Earlier mobile focal-point work is preserved separately at commit `fa59bf4`
  on `codex/mobile-subject-focal-points`; it is not part of this milestone.

## Starlight implementation

- Added child-free/text-free generated source and optimized WebP derivatives.
- Added the Starlight catalogue record through seed data and an idempotent
  additive production migration.
- Added structured celebrant name and age fields from database through builder,
  preview, public rendering, and PDF view-model conversion.
- Added a dedicated mobile-first Starlight opening and live hero using only the
  invitation's approved cover portrait.
- Promoted the Children portal and launch showcase to the live Starlight
  experience so it is discoverable from the home-page client journey.
- Added invitation-scoped photo suggestion logic and a replaceable
  personalization provider contract.
- Reused the live countdown, gallery, map, music, RSVP, order, publication, and
  print systems.
- Recorded architecture, privacy boundary, generated-art provenance, and the
  external-provider gate in `docs/starlight-pony-dreamscape.md`.

## Validation

- TypeScript: passed.
- ESLint: passed with no warnings or errors.
- Vitest: 77 files, 789 tests passed.
- Prisma schema validation: passed with a non-connecting validation URL.
- Database migration: all 18 migrations applied successfully to a fresh local
  PGlite/PostgreSQL instance, including the Starlight migration.
- Production build: passed; 32 static pages generated.
- Browser console: no warnings or errors on the Starlight live sample.
- Browser mobile QA: 360×800, 390×844, and 430×932; document scroll width
  equalled client width and all hero content remained visible.
- Native reference QA: 941×1672; hero height matched the viewport and document
  width did not overflow.

## Honest limitation

No customer child photos or configured identity-preserving generation provider
were supplied. The release therefore uses the exact approved project photo as a
separate live portrait layer. Provider-backed child-and-pony generation and its
cross-project identity QA remain blocked until those inputs exist.

## Release state

Implementation and local validation are complete. Before calling production
complete, record the final commit, PR, merge SHA, database migration outcome,
Vercel deployment URL, and production phone-width evidence here.

**Single next action:** review the final diff, commit and push this branch, then
open its Vercel preview at 390 px before applying the additive production
migration and merging.

## Continuity rule

Before any interruption, update this handover with branch/HEAD, exact
staged/unstaged state, production deployment, validation, blockers, and one
next action. Resume from this document and current Git/production state only.
