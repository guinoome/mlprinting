# Phase 5 — Website Generator: Design

**Status:** Approved by user, pending write-up into an implementation plan.
**Source spec:** `raw/ML Digital Event Platform (ML-DEP) Ph5.md` (drafted this session, confirmed as
Phase 5 by `Phase0-TechStack-Spec.md` §6).
**Builds on:** Phase 3's `Invitation` dataset and `features/invitation-builder/preview/model.ts`
(`toPreviewModel`), Phase 4's `services/media` (serving proxy, URL helpers), and the public
`app/templates/[slug]` route as the existing precedent for a slug-keyed public page.

## Objective

The second half of V1.md §7's **Design Once, Deliver Everywhere**. Phase 3 built the dataset and an
in-app, dashboard-chrome preview from it. This phase renders that same dataset as a real, live,
guest-facing website — mobile-first, ML-Printing-branded, its own SEO — reachable at a stable public
URL, with RSVP, countdown, maps, gallery, and a QR code layered on top of data the schema already
has.

## Resolved design decisions

These were open questions during brainstorming; each is settled and should not be re-litigated
during planning or implementation without coming back to this doc.

### 1. URL scheme — customer-chosen slug

`Invitation` gains `slug: String? @unique`, chosen by the customer at publish time (not during the
Ph3 builder — the builder's step registry is untouched by this phase). The slug is memorable and
shareable and doubles as the actual access-control boundary alongside the publish flag below; there
is no separate opaque id layered underneath. The slug is chosen once and kept across an
unpublish/republish cycle — republishing does not mint a new URL or invalidate a previously printed
QR code.

### 2. Publish state — a single boolean, not a three-way enum

`Invitation` gains `isPublished: Boolean @default(false)`. "Never published" and "unpublished" are
identical to every access check and to a guest (the route is not live either way) — the only
difference is UI copy ("Publish" vs. "Republish"), which the UI derives from whether `slug` is
already set. No enum, no extra state to keep consistent.

### 3. RSVP scope — collect and show, no guest identity

New model `RsvpResponse` (`invitationId`, `guestName`, `attending: Boolean`, `guestCount: Int
@default(1)`, `message: String?`, `createdAt`). No guest accounts, no edit-after-submit, no
deduplication — a guest who submits twice produces two rows, and the customer's list can show both.
This phase **does** include a dashboard view of responses (`/dashboard/events/[id]/rsvps`) —
collecting RSVPs nobody can read isn't a useful MVP slice, and this is confirmed in scope, not
deferred.

### 4. Guest media access — extend the existing serving route, don't fork it

Ph4's `/api/media/[assetId]/[version]/[variant]` route currently authorizes on session ownership
only. It gains a second, additive authorization path: an asset is servable if the caller's session
owns it (unchanged) **or** the asset is referenced by at least one currently-published `Invitation`
(new — `isAssetPublic(assetId)`, a join through `InvitationMedia` filtering `isPublished: true`). One
route, one set of storage objects, no signed-URL rotation reintroduced, no second bucket to keep in
sync. A photo in the dashboard's media library and the same photo on the live site are the same URL,
authorized differently depending on who's asking.

**Rejected alternatives:** time-limited signed URLs regenerated per guest page load (reintroduces the
exact caching problem Ph4's design doc argued against); mirroring published images into a second
public bucket at publish time (a second copy of the truth that has to stay correct across
replace/version-bump/unpublish, which Ph4 specifically avoided creating).

### 5. Shared view model — relocated, not cross-feature-imported

`features/invitation-builder/preview/model.ts` was written with the explicit, documented intent that
this phase would import it. Doing so as-is would mean `features/website-generator` reaching into
`features/invitation-builder` — the cross-feature import this codebase has forbidden since Phase 3.
Instead, this phase relocates the file (unchanged contents) to `lib/invitation/preview-model.ts`, a
small, mechanical, behavior-preserving move; Phase 3's `preview-step.tsx` gets its one import path
updated. This keeps "zero cross-feature imports" intact rather than asterisking an exception.

**Known carve-out:** `PreviewModel` only exposes pre-formatted display strings (`dateLine`, not a raw
`Date`) — correct for the in-app preview, but the countdown (below) needs a real target instant to
compute against client-side. Rather than widen `PreviewModel`'s contract, the public page fetches
`eventDate`/`timeZone` separately and passes them directly to the countdown component, bypassing the
view model for that one piece only.

## Data model changes

```prisma
model Invitation {
  // ...existing fields unchanged...
  slug        String?  @unique
  isPublished Boolean  @default(false)

  rsvps RsvpResponse[]
}

model RsvpResponse {
  id           String   @id @default(uuid()) @db.Uuid
  invitationId String   @db.Uuid
  guestName    String
  attending    Boolean
  guestCount   Int      @default(1)
  message      String?
  createdAt    DateTime @default(now())

  invitation Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  @@index([invitationId, createdAt])
  @@map("rsvp_responses")
}
```

No changes to any Phase 1-4 model beyond the two new `Invitation` fields. No invitation content is
duplicated into a website-specific table — the public page reads the same `Invitation` relations the
in-app preview already reads.

## Architecture

- **Public route:** `app/e/[slug]/page.tsx`, no auth. Looks up `Invitation` by `slug` where
  `isPublished: true` — anything else (`DRAFT`, unpublished, nonexistent slug) is `notFound()`, no
  distinction leaked between "doesn't exist" and "exists but private." Builds `PreviewInput`, calls
  the relocated `toPreviewModel`, renders via new presentational components in a new
  `features/website-generator/` feature — a real, full page, not the dashboard-chrome preview.
- **`generateMetadata()`** on the same route: title/description/OG image from the resolved model.
  Runs only for the published branch — the `notFound()` branch never reaches metadata generation, so
  nothing unpublished is ever indexable.
- **Countdown:** client component fed `eventDate`/`timeZone` directly (see Decision 5's carve-out),
  computes and ticks client-side, hides once the event has passed rather than freezing at zero.
- **Maps:** renders `InvitationVenue.mapsUrl` as a "View on Google Maps" link-out, not an embedded
  iframe — the Maps JavaScript API needs a billing-enabled key, a paid-adjacent service V1.md §11
  requires explicit approval for; address text (already resolved in the view model) always renders
  regardless of whether a link exists.
- **Gallery:** `PreviewModel.galleryUrls`, full-size, through the now-dual-purpose serving route
  (Decision 4).
- **QR code:** generated server-side with the `qrcode` package (MIT, free) from the public URL,
  served as a cacheable image — the same "pure function of its input" shape as Phase 2's
  placeholder-art route, encoding a URL instead of drawing a card.
- **RSVP submission:** a plain, intentionally unauthenticated Server Action
  (`submitRsvp(invitationId, formData)`). Validates the invitation exists and `isPublished`, then
  validates input at the boundary (name required, `guestCount` bounded, `message` length-capped) —
  the same "gate, not a scanner" posture as `services/upload/validation.ts`. No rate limiting, no
  CAPTCHA — not in scope, flagged as a known gap rather than silently handled.
- **RSVP dashboard view:** `/dashboard/events/[id]/rsvps`, reachable once `status === "COMPLETED"` —
  the first "manage a completed invitation" surface in this project; Phase 3's "My Events" only ever
  reopens a draft into the builder.
- **Publish control:** a "Manage website" action on a completed invitation leading to a new dashboard
  page — enter/reserve a slug (availability checked against the `unique` constraint before saving),
  Publish, then the same page shows the live URL, the QR code, and an Unpublish toggle. This is a new
  dashboard surface, not an addition to Phase 3's builder step registry.

## Testing approach

- `toPreviewModel` and the countdown's target-instant computation stay pure and unit-tested exactly
  as Phase 3 established — no change to that testing story, just a relocated file.
- RSVP input validation is pure logic, unit-testable without a database, mirroring
  `services/upload/validation.ts`.
- The slug-availability check, publish/unpublish, `isAssetPublic`, and the public route itself are
  Prisma-backed — verified via `pnpm db:local` + a browser, matching every other DB-backed surface in
  this codebase. No test file for these, by established convention (same as `services/media`'s
  repository layer in Phase 4).

## Out of scope

- Custom domains, subdomain mapping, SSL — Ph8's per-order deployment pipeline.
- Print-ready PDF output — Ph6.
- Booking/order workflow, payment — Ph7/Ph8.
- Guest accounts, guest photo/video uploads, Live Story Wall, Digital Memory Book — deferred roadmap
  items (FCP §11, V1.md §5).
- QR check-in (scanning guests in at the venue) — a different QR feature from this phase's
  invitation-link QR code; deferred per V1.md §5.
- Embedded/live Google Maps via the JS API — link-out only, per the free-tier constraint.
- RSVP spam protection, rate limiting, CAPTCHA.
- Analytics or view tracking on the public site.
- AI media enhancement, background removal — already out of scope since Phase 4.
- Multi-language UI chrome beyond what `Invitation.language` already drives in date/time formatting.

## API contract for future consumers

Nothing in this phase is a service other phases call into (unlike `services/media`) — the public
route and its Server Actions are the leaves of this tree. Ph6 (PDF Generator) and Ph8 (per-order
deployment) build on the same `Invitation`/`InvitationPersonalization`/media data this phase reads,
not on anything this phase introduces.
