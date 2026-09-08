# ML-DEP next mobile experiences handover

**Recorded:** 2026-09-09, Asia/Taipei
**Authoritative checkout:** `C:\Users\FraNc!s\Documents\ML Projects\ML Digital Event Platform (ML-DEP)`
**Remote:** `https://github.com/guinoome/mlprinting.git`
**Branch:** `codex/next-mobile-experiences`
**Production main:** `e419d291acb35ae7ed28c5b5eae497b0a8b9c55f`
**Production:** `https://mlprinting.vercel.app`

## Completed — do not rework

- Capiz Window, Neon Eighteen, Fiesta Banderitas, and Product Launch are live as the first four experience-led invitations.
- PR #8 is merged. Private payment-receipt upload, owner/staff-only viewing, staff approval/rejection, payment audit events, a one-pending-proof database guard, and a 4 MB upload limit are live.
- Production Supabase contains `payment_proofs` with RLS enabled and the pending-proof uniqueness index.
- Mobile invitation overflow was fixed and verified at 320, 390, and 768 CSS pixels.
- PayMongo hosted GCash/Maya/QRPh remains credential-gated. Vercel does not yet contain `PAYMONGO_SECRET_KEY` or `PAYMONGO_WEBHOOK_SECRET`; the user must sign in to PayMongo before those can be connected and tested.

## New user evidence and design rules

The 2026-09-09 phone screenshots are defect references, not instructions to repeat the existing four designs:

- The four-item mobile header crowds the viewport and wraps `ML-DEP`; future mobile surfaces need a compact brand plus one menu/control rather than desktop navigation squeezed into a phone.
- The current catalogue repeats one tall image-over-copy stack. New experiences must have their own mobile opening, visual language, transition rhythm, and guest journey—not only different imagery and names.
- Subject focal points must be selected for the phone crop. The principal person, couple, product, or cultural object cannot be pushed off-screen.
- The Capiz full-screen opening is the positive benchmark: one clear focal scene, legible title, one obvious action, no overlapping copy, and a controlled next-section reveal.
- Floating contact controls must not obscure invitation copy or primary actions.

## Active milestone — implemented, awaiting branch release

The next deliberate mobile-first release is implemented without rebuilding the completed four experiences. It adds three materially different Final 50 entries:

1. `ivory-lace` — formal couture wedding, tactile lace-shadow opening and restrained editorial journey.
2. `blush-botanical` — garden wedding, pressed-flower opening and organic chapter transitions.
3. `midnight-gold` — evening wedding, dark panel reveal and disciplined metallic programme.

Each experience needs its own opening, hero asset/focal points, mobile typography, motion/interaction treatment, catalogue presentation, and live invitation journey. Customer-uploaded media must remain authoritative when present.

Implemented in the working tree:

- `ivory-lace` — generated couture portrait, veil-lift opening, editorial hero/body treatment, dedicated sample content, launch-art mapping, focal points, catalogue proof, and release-gate registration.
- `blush-botanical` — generated garden portrait, bloom opening, photo-band journey, dedicated sample content, launch-art mapping, focal points, catalogue proof, and release-gate registration. The hero renderer now preserves text-free `/experiences/` art without applying the legacy typeset-cover blur.
- `midnight-gold` — generated black-tie portrait, partially open dark-panel entrance that keeps the couple visible, gold card-on-photo journey, dedicated sample content, launch-art mapping, focal points, catalogue proof, and release-gate registration.
- A new `Find your experience` homepage section recreates the reference's seven tall arched portals as real navigation. On phones it becomes a large horizontal snap rail rather than seven compressed columns. Wedding, Debut Nightlife, Filipino Cultural, Memorial, Corporate Launch, and Live Event have working destinations; Children is truthfully labeled `In the studio`.
- Memorial and Children use new text-free portal artwork (`memorial-sampaguita-portal.png` and `children-storybook-portal.png`) instead of the old typeset placeholder generator.
- The phone header is now brand + primary action + native menu; the floating Messenger control is hidden on phones so it cannot cover content.
- Customer-uploaded cover media remains authoritative through `--inv-entry-image`; generated launch art is only the fallback.

## Current validation evidence

- TypeScript: passed with `tsc --noEmit --incremental false`.
- ESLint: passed with no warnings or errors.
- Full Vitest suite: **76 files, 783 tests passed**. One stale four-slug marketplace expectation was updated to the deliberate seven-slug release gate and the full suite was rerun green.
- Production build: passed after the final finder-image priority update; 32 static pages generated.
- Browser QA used a feature-enabled disposable copy at `C:\dev\ml-dep-qa-20260909-finder`.
- `Find your experience`: verified at 320×568, 390×844, and 1440×900. Phone rail is horizontally scrollable/snap-aligned; document `scrollWidth === clientWidth`; portal tap targets are 218–265 px wide.
- Ivory Lace, Blush Botanical, and Midnight Gold: verified at 320×568, 390×844, 768×1024, and 1440×900. Each opening has `scrollWidth === clientWidth`, visible title/action, and a 48.1 px action height.
- Opened Ivory Lace keeps the bride visible; opened Blush Botanical uses an unblurred 4:5 photo band with both subjects visible; opened Midnight Gold retains the couple and full invitation card. No runtime errors were observed.
- The ignored source-checkout `.env.local` was created only to enable `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES=true` for local visual QA. It contains no credential and is not staged or tracked.

## Exact Git state at handover

- Branch: `codex/next-mobile-experiences`
- Base/HEAD before the pending commit: `e419d291acb35ae7ed28c5b5eae497b0a8b9c55f`
- The implementation and this handover are unstaged. Do not reset or clean them.
- `.codex-remote-attachments/` remains untracked reference material and must not be staged.
- New intended binary assets are the three invitation heroes plus the memorial and children portal art under `public/experiences/`.
- Single next action: review the complete diff, stage only the intended implementation/handover/assets, commit, push `codex/next-mobile-experiences`, open a PR, verify the Vercel preview, then merge and verify production.

## Validation gate

- Inspect the accepted/generated concept and the final browser render with `view_image`.
- Verify 320x568, 390x844, 768x1024, and desktop.
- Require `scrollWidth === clientWidth`, visible subjects, no clipped text/actions, 44–48 px touch targets, reduced-motion behavior, and no relevant console warnings/errors.
- Run Prisma generation when schema types require it, TypeScript, ESLint, the full Vitest suite, and a production build.
- Review the complete diff, exclude `.codex-remote-attachments/`, commit coherently, open a PR, require a green Vercel preview, merge, then verify production.

## Continuity rule

Before any limit or interruption, update this handover with branch, HEAD, staged/unstaged state, completed evidence, exact blockers, and the single next action. Every resuming agent must read `CURRENT_HANDOVER.md`, inspect Git status and production state, and move forward from the recorded milestone rather than redeploying completed work.
