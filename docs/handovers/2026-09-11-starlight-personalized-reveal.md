# ML-DEP Starlight personalized reveal handover

**Recorded:** 2026-09-11, Asia/Taipei

**Working copy:** `C:\codex-work\ml-dep-starlight`

**Branch:** `codex/starlight-personalized-reveal`

**Base / production main at start:** `bf4e14f03d63b4e1b74c27e08f6ad53a0f14dee5`

**Validated feature commit:** `f8e72a520fb5e02f11bd01efc63d99f589122569`

**Production:** `https://mlprinting.vercel.app`

## Completed locally

- Starlight now has a two-state guest journey: illustrated fictional toddler
  and unicorn before `Begin the Magic`, then a realistic fictional toddler and
  pony after opening.
- Celebrant name, age, countdown, date, venue, and RSVP remain live data. The
  public sample is `Mia`, age 3.
- Real invitation rendering still uses only the invitation's approved cover;
  the realistic generated child is limited to the public product proof.
- `Find your experience` removes Memorial, presents six celebration portals,
  and labels Starlight as Birthday.
- `Choose a world, not a card` guarantees Starlight inclusion and gives it a
  dedicated premium birthday feature with live-preview and detail actions.
- Starlight is now part of the customer-facing launch collection, backed by a
  direct allowlist contract test so it cannot silently disappear again.
- The template migration and seed now store the new entrance artwork.
- Reduced-motion behavior and 360-430 px responsive rules are included.

## Visual fidelity ledger

| Reference quality | Implemented evidence |
| --- | --- |
| Illustrated fantasy before opening | Full-viewport storybook entrance with fictional illustrated toddler and unicorn |
| Real toddler after opening | Fictional realistic toddler and pony sample in the opened hero |
| Personal name and age | Live `Mia` and `Turns 3`; no variable text is rasterized |
| Navy, violet, blush, and gold palette | Shared across both generated assets, live type, panels, and actions |
| Countdown and RSVP | Live compact panel remains visible in the first opened phone viewport |
| Premium motion | Star twinkle, name/age entrance, button pulse, and reveal transition with reduced-motion fallback |
| Mobile subject visibility | Both subjects and primary actions verified at every supported phone width |

## Validation completed

- Browser-led interaction QA: both states passed at 360x800, 375x812,
  390x844, 393x852, 412x915, and 430x932 with no horizontal overflow.
- Native comparison captures inspected at 390x844 and 941x1672 against both
  supplied concept images.
- Full Vitest suite: **78 files, 789 tests passed**.
- TypeScript: passed.
- ESLint: passed with no warnings or errors.
- Prisma schema validation: passed with an explicit local test URL.
- Clean PGlite: all **19 migrations** applied successfully after correcting the
  new migration's table target from `Template` to `templates`.
- Seed: **16 categories, 2 collections, 52 templates**; the seeded Starlight
  cover was queried and verified as
  `/experiences/starlight-pony-dreamscape-entry.webp`.
- Production build: passed against the migrated and seeded PGlite database; 32
  static pages generated without database fallback errors.

## Release state

The implementation is validated, committed, and pushed on
`codex/starlight-personalized-reveal`. A release PR has not yet been created or
merged; the additive migration has not been applied to Supabase and the change
has not been verified on production. Do not repeat the completed implementation
or local QA.

## Exact next action

Create the release PR from `codex/starlight-personalized-reveal` to `main`,
require its checks and preview deployment to pass, merge it, apply the additive
production migration, and repeat the phone-width interaction check on the
public domain.

## Continuity rule

Before any interruption, update this document with branch, HEAD, working-tree
state, PR/check/deployment state, production migration evidence, exact blocker,
and one next action. A resuming agent must read `CURRENT_HANDOVER.md`, inspect
Git and production, and continue only the pending milestone.
