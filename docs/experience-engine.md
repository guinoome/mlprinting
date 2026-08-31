# Experience Configuration Seam and WP20 Proofs

The first profile-level implementation and its validation gate are documented
in [`gold-standard-motion-invitation.md`](gold-standard-motion-invitation.md).

## Result

ML-DEP now resolves invitation presentation through one typed configuration seam:

`PreviewModel + ExperienceConfig + InvitationLayout + MotionProfile = ResolvedExperience`

`PreviewModel` continues to describe event content. `ExperienceConfig` describes presentation only. No customer content, raw CSS, timing value or arbitrary animation control crosses that boundary.

## Runtime

- `EXPERIENCE_REGISTRY` provides one fallback configuration per existing event kind.
- Exact template slugs may select a named experience before that event-kind fallback.
- `resolveExperience()` is pure and shared by the builder preview and public `EventSite` renderer.
- The existing layout registry remains authoritative for structure.
- Motion profiles reuse proven `rise`, `pop`, `sweep` and `fade` choreography.
- Reduced motion resolves to `M0`/`fade` without changing section content or order.
- `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES` defaults off, preserving legacy behavior until explicitly enabled.

## Proofs

The WP20 validation set now resolves three materially different templates through the same engine:

- `capiz-window`: SIGNATURE, P2, M3, MP-14; a type-led Filipino wedding with layered capiz light;
- `neon-eighteen`: IMMERSIVE, P3, M4, MP-09; a flat-bold debut with neon-grid and nightlife pacing;
- `in-loving-memory`: CORE, P1, M2, MP-12; a quiet, non-celebratory memorial with service information before programme content.

The public sample route owns truthful fallback content and cover art for these exact slugs, so the proofs remain testable without a database. Builder preview and public invitation both receive the same slug and resolve the same visual theme. The homepage exposes all three as direct live links; it does not depend on a catalogue query to make the proof set visible.

The three proofs are the gate for broader Final 50 visual scaling. The design-evolution matrix covers the catalogue, but a matrix entry is not evidence that all 50 templates have received and passed proof-level visual QA.

## Rollback

Leave `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES` unset or set it to `false`. The resolver then returns the existing layout motion, inherits the template's existing style, and labels its source `legacy`; no migration or data rollback is required.
