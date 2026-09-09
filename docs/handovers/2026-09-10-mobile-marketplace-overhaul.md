# ML-DEP mobile marketplace overhaul handover

**Recorded:** 2026-09-10, Asia/Taipei

**Authoritative checkout:** `C:\Users\FraNc!s\Documents\ML Projects\ML Digital Event Platform (ML-DEP)`

**Remote:** `https://github.com/guinoome/mlprinting.git`

**Working branch:** `codex/next-mobile-experiences`

**Production main before this release:** `5cdb24d43a741e866af914789b54ec04a5c4fc9e`

**Production:** `https://mlprinting.vercel.app`

## Completed production milestones — do not rework

- PR #9 is merged and deployed. Capiz Window, Neon Eighteen, Fiesta Banderitas, Product Launch, Ivory Lace, Blush Botanical, and Midnight Gold are live.
- The seven-portal, phone-scrollable `Find your experience` interface is live.
- Private receipt upload and staff verification are live.
- Automatic PayMongo GCash, Maya, and QRPh are not live. Activation still requires server-side `PAYMONGO_SECRET_KEY`, a verified `PAYMONGO_WEBHOOK_SECRET`, a signed production webhook, and end-to-end test transactions.

## Active milestone — implemented and validated locally

The old shared dark-blue marketplace surfaces were overhauled to match the image-led client-magnet experience system from the first tap through template selection:

- Premium compact navigation with a purpose-built phone header.
- Warm ivory, editorial template catalogue with image-led arched portals.
- Compact 44 px mobile filter and sort controls instead of a desktop filter column squeezed into the phone.
- Template details now use the real template artwork, an `Interactive` / `Print companion` presentation, a direct live invitation action, a guest-journey explanation, and a cohesive conversion section.
- Homepage feature, showcase, FAQ, closing conversion journey, and footer now use the same editorial visual language.
- Finder hash navigation now clears the sticky header.
- Ivory Lace, Blush Botanical, and Midnight Gold opening layers explicitly restore their opaque theme artwork after the shared luxury background shorthand, preventing old invitation text from showing through the opening.
- A reusable Playwright mobile release gate was added at `e2e/mobile-experience.spec.ts`.

## Validation evidence

- TypeScript: passed with `tsc --noEmit --incremental false`.
- ESLint: passed with no warnings or errors.
- Diff hygiene: `git diff --check` passed.
- Full Vitest suite: **76 files, 783 tests passed**.
- Production build: passed in the exact QA copy; 32 static pages generated. The authoritative checkout build process was interrupted after it became non-responsive in the Windows path, so this is not recorded as a source-path build pass.
- Mobile Playwright release gate: **8 tests passed** using installed Chrome, one worker, and the exact feature-enabled QA copy.
- Viewports: 320×844 and 390×844.
- Assertions: the finder rail scrolls without widening the document; the three new opening scenes own their opaque backgrounds; primary actions remain inside the viewport and at least 44 px tall; each reveal removes its opening overlay.
- A 390×844 full-page visual capture of the homepage was inspected. The hierarchy, subjects, invitation cards, feature sections, FAQ, closing image CTA, and footer remain readable without horizontal clipping.
- Local `/templates` database rendering cannot be visually validated in the disposable QA copy because it intentionally has no Supabase/database credentials. Production preview is therefore the authoritative catalogue and template-detail visual gate.

## First production release and visual follow-up

- PR #10 passed `Lint, typecheck, test, build`, received a successful Vercel preview deployment, and was squash-merged as `a8bf686fb5b5da576eddda45a125c511ebb80765`.
- The matching production deployment succeeded at `https://mlprinting-3ir1yu8j9-guinoomes-projects.vercel.app` and the public domain served the new marketplace.
- Production visual review covered `/templates` at 390×844 and 1440×900 plus `/templates/blush-botanical` at 390×844. Catalogue artwork, phone filters, two-column mobile cards, desktop portal grid, interactive template artwork, conversion actions, and content hierarchy rendered correctly without page overflow.
- Production then passed the same eight 320×844 and 390×844 Playwright interaction tests.
- Visual inspection caught a low-level contrast defect that the structural tests could not detect: Tailwind did not emit several non-standard numeric opacity utilities, so supporting/footer text inherited a darker colour than designed.
- The follow-up replaces those utilities with explicit arbitrary opacity values such as `text-white/[0.48]` and `bg-black/[0.42]`. Computed-style verification now returns `rgba(255, 255, 255, 0.48)` for the marketplace footer and `rgba(255, 255, 255, 0.58)` for the feature-supporting copy.
- After the follow-up, TypeScript, ESLint, diff hygiene, all 783 Vitest tests, the production build, and all eight local mobile Playwright tests passed again.
- PR #11 was closed without merge because its branch retained PR #10's pre-squash history and GitHub correctly reported a dirty merge. The identical correction was cherry-picked onto current main as clean PR #12.
- PR #12 passed `Lint, typecheck, test, build` and Vercel preview, then squash-merged as `fdcbc95955f91598cb55e665f431c5d7bf7cb783`.
- The exact production deployment succeeded at `https://mlprinting-2n9lt99nj-guinoomes-projects.vercel.app`; the public domain `https://mlprinting.vercel.app` serves it.
- Final public-domain verification at 390 px reports no horizontal document overflow, marketplace footer colour `rgba(255, 255, 255, 0.48)`, and feature-supporting copy `rgba(255, 255, 255, 0.58)`.
- The public production site passed all eight 320×844 and 390×844 Playwright interaction tests after the contrast deployment.

## Exact working-tree boundaries

- Intended source changes are limited to the shared homepage, header, marketplace catalogue, template-detail presentation, responsive theme CSS, Playwright configuration, and the new mobile E2E test.
- `.codex-remote-attachments/` is untracked user reference material and must never be staged.
- `.env.local` is ignored, contains only the interactive-experience feature flag in the QA workflow, and contains no credential.
- Test output, screenshots, and `playwright-report` / `test-results` artifacts must not be staged.

## Release gate and exact next action

1. Review `git diff --stat` and the final diff for accidental files.
2. Stage only the intended source files plus this handover.
3. Commit the milestone.
4. Create a clean release branch from `origin/main` and cherry-pick the milestone commit so PR history does not replay PR #9.
5. Push, open the PR, and inspect its Vercel preview at 390 px and desktop for `/`, `/templates`, and one real `/templates/[slug]` page backed by production-like data.
6. Require the repository check to pass, merge, poll the Vercel deployment by merge SHA, and verify `https://mlprinting.vercel.app`.
7. Update this handover with the PR, merge SHA, deployment URL, production evidence, and one next action.

**Single next action:** resume PayMongo activation only after the account owner signs in and the server-side secret key plus signed webhook secret can be configured securely; then run GCash, Maya, and QRPh test transactions before enabling automatic payment validation.

## Continuity rule

Before any limit or interruption, update this handover with branch, HEAD, staged/unstaged state, production deployment, validation, exact blockers, and one next action. Every resuming agent must read `CURRENT_HANDOVER.md`, inspect Git and production state, and continue only the pending milestone.
