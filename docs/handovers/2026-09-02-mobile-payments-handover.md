# ML-DEP mobile invitations and payments handover

**Recorded:** 2026-09-02, Asia/Taipei  
**Authoritative checkout:** `C:\Users\FraNc!s\Documents\ML Projects\ML Digital Event Platform (ML-DEP)`  
**Remote:** `https://github.com/guinoome/mlprinting.git`  
**Branch:** `codex/ml-dep-four-experience-overhaul`  
**HEAD when recorded:** `cdcffb6 feat: overhaul four flagship invitation experiences`  
**Production:** `https://mlprinting.vercel.app`

## 1. Active user objective

Finish the interrupted invitation-renderer work, make every flagship invitation genuinely mobile-first, overhaul the old login/register screens, then resume Phase 8 payments. The user's five phone screenshots are the accepted visual references. In particular:

- mobile heroes must keep the main person/couple/product visible rather than cropping them away;
- wedding, debut, and corporate invitations should read as full-screen cinematic covers;
- login and registration must no longer look like a generic dark scaffold;
- complete payment functionality without weakening authentication, authorization, audit trails, or secret handling;
- validate and deploy the coherent round when complete.

Do not copy reference assets into production or commit `.codex-remote-attachments/`.

## 2. Repository state — preserve this split

The worktree is intentionally dirty. Do not reset, clean, checkout, or re-stage indiscriminately.

### Pre-existing staged work from the interrupted prior session

Thirteen files are staged: 543 insertions / 690 deletions. They contain landing, catalogue, template-card, and proof-showcase polish that predates the current mobile/payment pass:

- `app/globals.css` (staged deletion portion only; the same file also has new unstaged edits)
- `app/page.tsx`
- `app/templates/(catalog)/page.tsx`
- `app/templates/[slug]/page.tsx`
- `app/templates/layout.tsx`
- `components/nav/site-header.tsx`
- `features/marketing/components/experience-proof-showcase.tsx`
- `features/marketing/components/faq-section.tsx`
- `features/marketing/components/feature-highlights.tsx`
- `features/marketing/components/landing-hero.tsx`
- `features/marketing/components/template-showcase.tsx`
- `features/template-marketplace/components/template-card.tsx`
- `features/website-generator/experience/proofs.ts`

Review and validate this staged work, but do not overwrite or discard it.

### New unstaged work completed in the current pass

Eleven tracked files contain 322 insertions / 58 deletions:

- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/globals.css`
- `features/auth/components/login-form.tsx`
- `features/auth/components/register-form.tsx`
- `features/website-generator/components/event-site.tsx`
- `features/website-generator/components/hero.tsx`
- `features/website-generator/experience/registry.test.ts`
- `features/website-generator/experience/registry.ts`
- `features/website-generator/experience/types.ts`

The untracked `.codex-remote-attachments/` directory contains user-supplied screenshots and must remain uncommitted.

Run `git status --short --branch`, `git diff`, and `git diff --cached` before the next edit. Never use destructive git commands.

## 3. Completed mobile implementation

### Responsive hero focal points

The prior implementation used one broad mobile crop (`object-position: 68%`) for several unrelated wide images. On a tall phone viewport, that could hide the primary person or product. The new implementation makes crop intent typed and per experience:

- `features/website-generator/experience/types.ts`
  - adds `MediaFocalPoint` and `ResponsiveMediaFocalPoint`;
  - requires `heroFocalPoint` on every `ExperienceConfig`.
- `features/website-generator/experience/registry.ts`
  - defines centred defaults;
  - defines explicit desktop/tablet/mobile focal points for capiz wedding, neon debut, fiesta, product launch, and memorial;
  - all generic and final-50 experiences remain centred unless deliberately overridden.
- `features/website-generator/components/event-site.tsx`
  - passes the selected focal point to `Hero`.
- `features/website-generator/components/hero.tsx`
  - exports `focalPointStyle` and writes desktop/tablet/mobile values into CSS custom properties;
  - full-bleed and card-on-photo heroes apply those properties.
- `app/globals.css`
  - `.inv-hero-photo` uses the desktop value;
  - max-width 1024px switches to tablet;
  - max-width 700px switches to mobile;
  - obsolete theme-specific object-position rules were removed.
- `features/website-generator/experience/registry.test.ts`
  - validates every coordinate is between 0 and 100 and asserts important mobile shifts.

Current flagship focal points are intentionally image-specific:

- capiz wedding: desktop `76% 50%`, tablet `79% 50%`, mobile `83% 50%`;
- neon debut: `76/79/82`, y around `46–48%`;
- fiesta: `74/78/81`, y around `46–48%`;
- product launch: `68/70/72`, y `52%`;
- memorial: centred.

### Auth visual overhaul

The login and registration screens now use a warm editorial/paper system rather than the old generic navy scaffold:

- desktop: 44vw photographic art rail plus focused form panel;
- mobile: compact 30svh image header and overlapping 70svh paper form;
- fixed light semantic variables inside `.auth-stage`, preventing a persisted dark theme from making text invisible;
- stronger hierarchy, editorial underline fields, 48px touch targets, uppercase primary action, and improved copy;
- existing `/experiences/capiz-window-hero.png` is reused; no new asset dependency.

## 4. Browser evidence already collected

A disposable QA copy was created at `C:\dev\ml-dep-qa-20260902`. It excludes `.git`, secrets, `.next`, `node_modules`, and attachments, then junctions `node_modules` to `C:\dev\ml-dep\node_modules`. Prisma Client was regenerated from the authoritative current schema. TypeScript then passed:

```text
tsc --noEmit --incremental false → exit 0
```

The local QA server ran on `http://localhost:3100`. A 390x844 responsive browser session opened:

```text
/invite-preview?template=capiz-window
```

Verified visually:

- the capiz entry cover keeps the groom visible at the right edge;
- after tapping **Open the light**, both people are clearly visible in the hero;
- names, date row, music control, and down cue remain readable and reachable;
- the DOM exposed the complete invitation and RSVP flow.

The supplied reference screenshot and this implementation are directionally aligned: full-height mobile image, subject visible, event type at the lower third, date below, music control floating at bottom-right.

### Remaining responsive defect discovered during QA

The opened invitation showed a horizontal scrollbar. Measurements:

```text
innerWidth: 434
documentElement.clientWidth: 417
documentElement.scrollWidth: 431
body.scrollWidth: 431
```

The hero itself is correctly 417px wide. Some later invitation sections extend roughly 14px beyond the document. The repository contains deliberate full-bleed `100vw` rules in `.inv-band-photo` and `.inv-grid-photos`, but the capiz sample uses a full-bleed hero, so do not assume those are the only source. Continue by:

1. inspecting `.inv-main` around `app/globals.css:1000` and `.inv-reveal-root` around lines 265 and 1262;
2. querying each overflowing element's rectangle, computed width, padding, and parent;
3. fixing the actual width calculation rather than hiding the issue globally with `overflow-x: hidden`;
4. retesting at 320, 390, 768, and desktop widths.

The browser session and dev-server process are ephemeral; start fresh if unavailable.

## 5. Phase 8 payment audit and exact remaining gap

Read the authoritative spec before editing:

```text
raw/ML Digital Event Platform (ML-DEP) Ph8.md
```

### What already exists

- PayMongo checkout service and signed webhook processing;
- supported online methods include GCash, Maya, and QR Ph where the provider/account permits them;
- strict authentication and staff authorization;
- amount and currency verification before marking payment paid;
- append-only `OrderEvent` audit entries for payment transitions;
- staff controls to record an offline settlement or waive payment;
- customer order page and admin booking surfaces.

Relevant files:

- `features/payments/actions.ts`
- `features/payments/checkout-action.ts`
- `features/payments/components/settlement-controls.tsx`
- `services/commerce/paymongo.ts`
- `services/commerce/repository.ts`
- `services/commerce/state.ts`
- `app/api/webhooks/paymongo/route.ts`
- `app/(dashboard)/dashboard/orders/[id]/page.tsx`
- `app/(dashboard)/admin/bookings/page.tsx`
- `prisma/schema.prisma` (`Payment`, `OrderEvent`, payment enums)

### Missing MVP capability

The Phase 8 document explicitly includes customer proof-of-payment upload plus staff manual approval for GCash/bank-transfer style offline payments. The current code can let staff record settlement, but there is no customer receipt/proof upload record or review flow.

Implement the smallest defensible extension:

1. Add an ownership-scoped `PaymentProof` record (or equally explicit name) with immutable submission metadata and review fields. Do not overload invitation `MediaAsset`; payment proof is financial evidence, not reusable invitation media.
2. Store proof bytes in an existing private bucket under an owner/order-scoped path. Never make receipts public.
3. Validate file size and MIME type; allow only the documented image/PDF evidence types.
4. Customer submit action must derive `profileId` from the authenticated session and prove order ownership in the database query.
5. Staff review action must call the existing staff guard and append an `OrderEvent`; approval should transition payment using existing state rules, not duplicate state logic.
6. Add an authenticated download/view route with owner-or-staff authorization. Do not expose raw permanent storage URLs.
7. Show proof status to the customer and pending-proof review controls to staff.
8. Unit-test validation, ownership query shape, and legal transitions. Add integration coverage where existing test seams allow it.

Do not require PayMongo secrets to validate the manual path. Real online checkout/webhook validation still requires the user's own configured provider credentials; do not fabricate or commit them.

### Migration rule

Do not run `prisma migrate dev` against the PGlite setup. This repository previously hit a P1017 protocol incompatibility. Use the established sequence:

```text
prisma migrate diff --from-migrations ... --to-schema-datamodel ... --script
prisma migrate deploy
```

Review generated SQL before applying it. Ensure CLI banners are not accidentally redirected into `migration.sql`.

## 6. Validation and QA workflow

The authoritative checkout lives under a path containing `!`, and Windows Controlled Folder Access can block child-process writes. The safe pattern is:

1. Edit only the authoritative checkout.
2. Copy source into a disposable neutral-path QA mirror, excluding `.git`, secrets, attachments, `.next`, and `node_modules`.
3. Junction the QA mirror's `node_modules` to the matching lockfile installation at `C:\dev\ml-dep\node_modules`.
4. Run Prisma generate after schema changes.
5. Run each command directly; do not pipe into `tail` because a pipe can hide the real exit code.

Required completion gate:

```text
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Then perform browser QA at minimum:

- capiz wedding, neon debut, fiesta, product launch, and memorial;
- 320x568, 390x844, 768x1024, and desktop;
- login and register at mobile/tablet/desktop;
- no horizontal scroll;
- subject remains visible;
- text contrast and touch targets remain usable;
- reduced-motion path;
- console warnings/errors;
- customer payment-proof submit, customer status, staff review, unauthorized access denial.

## 7. Git and deployment sequence

1. Review staged and unstaged diffs separately.
2. Never add `.codex-remote-attachments/`, `.env.local`, `.env.vercel.local`, generated receipts, or credentials.
3. Make coherent commits. Preserve the prior staged polish as its own logical commit if practical; keep mobile/auth and payment changes auditable.
4. Push `codex/ml-dep-four-experience-overhaul` using the user's configured GitHub credential flow. Do not use chat-pasted PATs.
5. Confirm Vercel's deployment for that branch or merge through the repository's established workflow.
6. Verify production routes and the final invitation behavior at `https://mlprinting.vercel.app`.

Do not report production success from a build alone. Record the live URL, deployment state, and actual smoke-test results.

## 8. Highest-priority next actions

1. Reproduce and remove the 14px mobile horizontal overflow at its source.
2. Visually validate all four subject-focused experiences plus auth at phone and tablet sizes; tune focal points only from evidence.
3. Implement the missing private manual payment-proof submission/review path using existing commerce transitions and audit events.
4. Run the complete validation gate in the neutral QA mirror.
5. Review, commit, push, deploy, and verify production.

## 9. Safety boundaries

- Preserve all existing staged and unstaged user work.
- Do not expose or echo Supabase, database, PayMongo, Vercel, or GitHub credentials.
- Never make payment evidence public.
- Never trust caller-supplied ownership or staff roles.
- Do not weaken auth to make browser testing easier.
- Avoid broad cleanups while this milestone is active.
- Separate verified results from remaining work in every report.
