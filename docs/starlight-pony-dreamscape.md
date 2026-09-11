# Starlight Pony Dreamscape

## Product contract

Starlight Pony Dreamscape is a first-class ML-DEP birthday experience. It uses
the existing marketplace, builder, private media library, public renderer,
countdown, gallery, map, music, RSVP, print, order, and publication systems.

The experience has two deliberate states:

1. **Storybook entrance.** Before the invitation opens, a fictional illustrated
   toddler and unicorn establish the world. The celebrant name, age, and
   `Begin the Magic` action are live HTML, not text baked into the artwork.
2. **Personal reveal.** After the action, the sample reveals a fictional,
   realistic toddler portrait with the same live name and age, followed by the
   countdown, RSVP, date, and venue. A real published invitation uses only that
   invitation's customer-approved `COVER` asset in this position.

The public sample uses `Mia`, age 3. Customers replace the name, age, portrait,
date, venue, and message without changing the visual system.

## Design ownership contract

Starlight is a content-only template. The template owns typography, colour,
theme, motion, components, image treatment, and responsive layout. The customer
supplies structured invitation content and invitation-approved media; the
builder does not ask the customer to redesign the template.

This is enforced twice:

- the Personalize step removes generic visual controls for Starlight and
  explains which decisions the template protects;
- the server write boundary resets crafted visual overrides to the controlled
  defaults while still honoring section visibility.

The builder's screen preview embeds the same `EventSite` renderer used by a
published invitation. Its mobile tab is a real contained 360-pixel layout, not
a scaled desktop mockup. Live RSVP, music, map, calendar, and share side effects
are disabled in the approval surface; `Begin the Magic` remains interactive so
the two-state reveal can be reviewed.

## Discovery surfaces

- `Find your experience` presents six celebration entrances. Memorial is not a
  portal in that marketing finder; Birthday now links directly to Starlight.
- `Choose a world, not a card` guarantees Starlight a dedicated premium feature
  rather than relying on catalogue ordering. The feature explains the two-step
  reveal and links to both the live proof and template detail.
- The launch proof and marketplace continue to use the same live preview route.

## Identity and privacy boundaries

- Supplied references define composition and mood only; they are not identity
  sources.
- Both public sample children are fictional generated people. They are not
  based on or intended to resemble the child in a supplied reference.
- Published sites receive only media assigned to their invitation.
- Customer media remains a separate live layer served through the existing
  private-media proxy; names and ages remain structured data.
- The child photograph is static. Only ambient stars, type, the entry action,
  and transition affordances animate.
- Candidate ranking examines invitation-owned metadata and never performs face
  recognition or scans another customer's content.

`features/website-generator/experience/design-policy.ts` records the governing
contract: template owns the visual experience, invitation-approved media owns
identity, and structured project data owns invitation information.

`services/personalization/types.ts` remains the boundary for any future
provider-backed customer composite. This release does not claim identity-
preserving generation. No synthetic composite is shown as a customer's child
until a provider passes the gate below.

## Mobile and motion contract

Both states are release-gated at 360, 375, 390, 393, 412, and 430 CSS pixels.
The document must not widen at any supported width. The first viewport keeps
the name, age, primary action, and main subject legible; the opened viewport
keeps the realistic portrait, countdown, RSVP, date, and venue visible without
requiring a desktop layout.

Ambient stars twinkle, the live name and age arrive gently, and the primary
action pulses. `prefers-reduced-motion` removes non-essential motion without
removing content or controls.

## Artwork and provenance

Immutable generated sources:

- `raw/experiences/starlight-pony-dreamscape-entry-master.png`
- `raw/experiences/starlight-pony-dreamscape-sample-toddler-master.png`

Optimized delivery assets:

- `public/experiences/starlight-pony-dreamscape-entry.webp`
- `public/experiences/starlight-pony-dreamscape-sample-toddler.webp`

The built-in image generator produced both assets without rasterized names,
ages, dates, buttons, logos, or phone chrome. The entrance prompt requested a
premium navy, violet, blush, and warm-gold storybook world with an illustrated
fictional toddler embracing a gentle unicorn. The opened-state prompt requested
a realistic but fictional toddler beside a small white pony in the same
moonlit world. Neither prompt used a reference child as an identity source.

Generator outputs retained by Codex:

- `C:/Users/FraNc!s/.codex/generated_images/01a04ba5-9d72-7310-8fd5-4a9ad28f5d75/exec-e95082ee-52b9-4f14-9dde-d42785bae068.png`
- `C:/Users/FraNc!s/.codex/generated_images/01a04ba5-9d72-7310-8fd5-4a9ad28f5d75/exec-ea74cb29-6dd9-4aa8-89d9-6aa7ba1890df.png`

## Intentional differences from the concept boards

- The production page does not imitate a phone hardware frame or the concept's
  surrounding annotation poster; it is the actual phone web experience.
- All variable copy and commerce actions are live, accessible elements.
- The public realistic portrait is a fictional product sample. Customer
  invitations substitute the approved customer cover instead.
- The design uses restrained web motion rather than animating a child's face.

## Future provider gate

A generated composite preserving a specific customer's identity remains out of
scope until consented source photos, a configured provider, private intermediate
storage, approved-output caching, retry/fallback behavior, and wrong-person or
cross-project leakage tests all exist.
