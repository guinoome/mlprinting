# Experience Configuration Seam (WP-01)

The first profile-level implementation and its validation gate are documented
in [`gold-standard-motion-invitation.md`](gold-standard-motion-invitation.md).

## Result

ML-DEP now resolves invitation presentation through one typed configuration seam:

`PreviewModel + ExperienceConfig + InvitationLayout + MotionProfile = ResolvedExperience`

`PreviewModel` continues to describe event content. `ExperienceConfig` describes presentation only. No customer content, raw CSS, timing value or arbitrary animation control crosses that boundary.

## Runtime

- `EXPERIENCE_REGISTRY` provides one configuration per existing event kind.
- `resolveExperience()` is pure and shared by the builder preview and public `EventSite` renderer.
- The existing layout registry remains authoritative for structure.
- Seven initial motion profiles reuse proven `rise`, `pop`, `sweep` and `fade` choreography.
- Reduced motion resolves to `M0`/`fade` without changing section content or order.
- `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES` defaults off, preserving legacy behavior until explicitly enabled.

## Proofs

The resolver test covers three materially different registers through the same engine:

- wedding: luxury/editorial;
- birthday: playful/kinetic;
- funeral: quiet, non-celebratory memorial.

## Rollback

Leave `NEXT_PUBLIC_FEATURE_INTERACTIVE_EXPERIENCES` unset or set it to `false`. The resolver then returns the existing layout motion and labels its source `legacy`; no migration or data rollback is required.
