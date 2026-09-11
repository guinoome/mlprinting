# Starlight template-DNA release handover — 2026-09-12

## Release truth

- Authoritative checkout: `C:\codex-work\ml-dep-starlight`
- Feature branch: `codex/starlight-template-dna`
- Released code commit: `c11546317301d87c336aeb334c2b49d29aa97e03`
- Remote production branch: `origin/main` at the released code commit when
  production verification completed
- Production: <https://mlprinting.vercel.app>
- Vercel deployment: `AVq8ueNwcr36v2CWbXena8pHRsng`
- Vercel commit status: `success` (`Deployment has completed`) at
  `2026-09-11T23:49:38Z`

The Supabase production row for `starlight-pony-dreamscape` points to
`/experiences/starlight-pony-dreamscape-entry.webp`. Prisma migration
`20260911010000_starlight_personalized_reveal` is recorded with checksum
`e0898e4644ab1810629462563df74920e7faa179d81efaf37fdc9170444c5770`.

## Completed in this increment

- Added a typed template design policy. Starlight is `content-only`; it owns
  typography, colour, theme, motion, components, image treatment, and layout.
- Removed generic visual controls from Starlight's Personalize step and replaced
  them with a clear template-ownership explanation. Section visibility remains
  customer-controlled.
- Enforced the policy in the server action so a crafted form post cannot replace
  Starlight's visual tokens.
- Replaced Starlight's generic builder screen preview with a lazy-loaded embed of
  the production `EventSite` renderer. Mobile, tablet, and desktop previews use
  bounded responsive frames and container-based phone rules.
- Kept `Begin the Magic` interactive in approval preview while suppressing RSVP
  submission, music, sharing, calendar, map, and other navigation side effects.
- Encoded the durable ownership boundary in repository documentation:
  the template owns presentation, invitation-approved media owns identity, and
  structured invitation data owns the event information.
- Added a six-width Playwright release gate for the Starlight entrance and
  opened state.

## Validation completed

- `vitest run`: 79 files, 793 tests passed.
- Focused design-policy tests: 4 passed, including server-side override
  enforcement and the guided-template fallback.
- TypeScript: `tsc --noEmit` passed.
- ESLint: no warnings or errors.
- Next.js optimized production build passed; 32 static pages generated.
- Local Playwright suite: 14/14 passed serially.
- Production Playwright Starlight gate: 6/6 passed at 360, 375, 390, 393,
  412, and 430 CSS pixels.
- Local screenshot inspection at 390x844 and 1440x900 confirmed the entrance and
  opened compositions, loaded portrait, name `Mia`, age 3, countdown, RSVP, no
  horizontal overflow, and no console/page errors.
- Browser plugin was not available; validation used the repository's regular
  Playwright installation and installed Chromium runtime.

## Boundaries and unresolved work

- The protected builder could not be driven end to end in automation without a
  safe test account. Its server/client integration compiled and shipped, but one
  authenticated real-draft phone review remains the release follow-up.
- Customer-approved `COVER` media is the truthful identity source today. The
  repository has a provider boundary and identity-preservation policy, but no
  vetted identity-preserving composite provider is configured. Do not enable or
  advertise synthetic customer composites until consent, private intermediates,
  caching, fallback, and wrong-person/cross-project leakage tests exist.
- Automatic PayMongo GCash, Maya, and QRPh remain server-credential, signed-
  webhook, and end-to-end transaction gated. Manual private payment proof is a
  separate already-released path.

## Exact continuation

Open one real Starlight draft while authenticated on a phone, confirm that the
Personalize step exposes content/section choices rather than visual theme
controls, then open the Preview step and exercise `Begin the Magic` with the
draft's approved cover. Record only defects found; do not redo the public
renderer, discovery work, migration, or six-width QA.
