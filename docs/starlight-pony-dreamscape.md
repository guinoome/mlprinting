# Starlight Pony Dreamscape

## Production scope

Starlight Pony Dreamscape is a first-class ML-DEP birthday experience, not an
isolated demo. It reuses the existing template marketplace, builder, private
media library, preview/public renderer, countdown, gallery, map, music, RSVP,
print, order, and publication systems.

The launch vertical slice deliberately separates three concerns:

1. `public/experiences/starlight-pony-dreamscape-hero.webp` is a reusable,
   child-free and text-free fantasy world.
2. The invitation's approved `COVER` asset is the only child portrait shown in
   the experience. It remains a separate live layer served through the existing
   private-media proxy.
3. Celebrant name, age, date, venue, message, and actions are structured data
   rendered as live HTML. Changing copy does not regenerate or alter the photo.

The immutable source artwork is retained at
`raw/experiences/starlight-pony-dreamscape-master.png`; the catalogue and hero
WebP derivatives are optimized delivery assets.

## Identity and project boundaries

- Neither supplied reference image is an identity source.
- The reusable template artwork contains no child.
- Candidate ranking examines only media already assigned to the current
  invitation and never scans another customer's content.
- Ranking uses customer tags, filename, dimensions, and orientation. It is not
  face recognition and never claims an identity match.
- A suggestion always requires the customer's explicit cover selection.
- Published sites receive only media linked to that invitation.
- Existing media originals remain immutable. Optional derivatives retain their
  source asset and version relationship.
- The child photograph is static; only ambient stars, background drift, and UI
  affordances animate.

`services/personalization/types.ts` defines the replaceable provider contract
for a future approved build-time composite. The current production path uses a
direct live portrait layer because no external identity-preserving provider or
consented customer photo set was supplied. This is an honest fallback, not a
simulated generation result.

## Builder behavior

- Birthday events expose first-class `celebrantName` and `celebrantAge` fields.
- Starlight's media step explains the identity boundary and asks the customer
  to approve one cover portrait.
- Only invitation-assigned assets can appear as automated suggestions.
- A portrait-oriented, sufficiently large, customer-labelled asset ranks
  higher, but the customer still confirms it.

## Mobile contract

The opening and hero are release-gated at 360, 375, 390, 393, 412, and 430 CSS
pixels. Important content uses live safe-area-aware layout rather than raster
text. The celebrant name scales by length and can wrap without widening the
document. The approved portrait uses a bounded portrait mask and never relies
on globally hiding overflow to conceal a crop defect.

Reduced-motion users receive a static background, stars, and scroll cue. The
content and controls remain unchanged.

## Generated-art provenance

Built-in image generation was used in reference-guided concept mode. The final
accepted prompt was:

> Edit the supplied child-free Starlight Pony Dreamscape background into one
> clean reusable vertical invitation world. Preserve the navy, violet, blush,
> and warm-gold palette; luminous crescent moon; distant enchanted castle;
> layered cloud terraces; flower-framed edges; and sparkling star field. Add
> one gentle white pony/unicorn integrated naturally in the lower-right third,
> leaving a generous calm central-left zone for a separately composited,
> customer-approved child portrait and live interface copy. No people, no
> children, no faces, no names, no letters, no numbers, no UI, no phone frame,
> no logo, no watermark, and no checkerboard. Portrait 941 by 1672 composition,
> polished premium children's fantasy invitation, subject-safe at mobile crop.

The accepted generated source was saved by Codex at
`C:/Users/FraNc!s/.codex/generated_images/01a04ba5-9d72-7310-8fd5-4a9ad28f5d75/exec-5dfab82c-bf69-4ceb-ae26-30c7acacc71a.png`
and copied into the project as the immutable master above.

## Known gate before generated child-and-pony composites

A photoreal generated scene of a specific client child embracing the pony is
not enabled by this release. Enabling it requires all of the following:

- the customer's consented source photos;
- a configured identity-preserving provider behind the existing interface;
- private intermediate storage and approved-output caching;
- retry, timeout, and fallback behavior tested against that provider;
- same-child, wrong-child, sibling, poor-light, group-photo, and
  cross-project-leakage QA.

Until those gates pass, the live portrait-layer composition is the production
fallback and the system must not imply that a synthetic identity match occurred.
