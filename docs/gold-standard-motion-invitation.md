# Gold Standard Motion Invitation

**Status:** WP-02 implementation baseline
**Rollout:** `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES=true`

## Experience signature

The first Gold Standard experience is the `luxury` wedding profile:

> A tactile invitation opens like a ceremonial paper object, then settles into
> an editorial story whose motion guides the guest from anticipation to RSVP.

The visual reference uses warm paper, a deep ceremonial opening, portrait-led
hierarchy, restrained metallic rules, and quiet chapter transitions. The
runtime recreates those qualities with HTML and CSS; the reference image is not
shipped as page artwork.

## Journey

The shared `EventSite` renderer supplies the complete WP-02 path:

`Opening → Hero → Countdown → Story/Programme → Gallery/Video → Music → Venue → Calendar → RSVP → Share → QR`

Modules remain conditional on real invitation content. Missing gallery or video
media does not leave an empty stage, music stays guest-controlled, and the
essential invitation is server-rendered beneath the opening overlay.

## Reusable boundaries

- `InvitationShell` owns opening state, the resolved experience attributes,
  confetti, scroll observation, parallax, and reduced-motion escape behavior.
- `MotionStage` is the semantic chapter primitive. Renderers name a stage and
  provide content; they cannot select timing or transforms.
- `Hero`, `PhotoFrame`, `MusicPlayer`, `InvitationActions`, `RsvpForm`, and
  `QrFooter` remain shared interaction primitives.
- `ExperienceConfig` selects the profile and motion level. Invitation records
  remain presentation-free.
- Profile CSS is gated by `data-experience-enabled="true"`; disabling the
  feature flag restores the legacy presentation without a data migration.

## Motion and accessibility

The `luxury` profile uses:

- slow ambient opening geometry;
- a tactile paper envelope and embossed seal treatment;
- post-open hero focus and staggered copy;
- scroll-triggered editorial chapter rules;
- elevation only on action-oriented venue and RSVP surfaces.

`prefers-reduced-motion: reduce` removes envelope ambience, hero animation,
confetti, parallax, animated ornaments, and section transitions. Content stays
visible and in the same order. The resolver also reports `M0`/`fade` when
reduced motion is selected, so preview and public runtime share the same
fallback semantics.

## Reliability notes

- Opening is idempotent; repeated taps cannot schedule duplicate transitions or
  confetti bursts.
- The countdown initially renders stable placeholders, then reads the visitor's
  clock after hydration. This prevents a one-second server/client mismatch from
  replacing the invitation root.
- The hero image keeps its existing parallax transform; the profile's focus
  animation changes opacity and saturation without competing for `transform`.
- The no-script rule removes the overlay and exposes all essential content.

## Validation gate

Before enabling the flag in a deployment:

1. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.
2. Inspect the opening and full journey at a phone viewport.
3. Repeat with operating-system reduced motion enabled.
4. Confirm countdown hydration produces no browser warning.
5. Check map, calendar, RSVP, share, QR, and music controls with representative
   invitation data.
