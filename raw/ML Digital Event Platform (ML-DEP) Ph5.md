# ML Digital Event Platform (ML-DEP)
## Phase 5 — Website Generator

**Status:** DRAFT — proposed by the FDG Implementation Collaborator for review, not yet approved. Written because this file was empty; `Phase0-TechStack-Spec.md` §6 flagged it as undocumented and confirmed the sequence implies this phase.

---

## Objective

Turn a completed invitation — the structured dataset Phase 3 collects, the design choices Phase 3 approves, and the photos Phase 4 stores — into a real, live, guest-facing event website.

This is the second half of V1.md §7's **Design Once, Deliver Everywhere**. Phase 3 already proved the split works: `features/invitation-builder/preview/model.ts` resolves an `Invitation` + `InvitationPersonalization` + media URLs into one `PreviewModel`, specifically so a second renderer could be built on it without re-deriving what the invitation says. This phase is that second renderer.

**What changes, precisely:** the in-app preview (Ph3.md §10) is a component inside the dashboard — approximate, iframe-sized, updates as the customer types, never seen by a guest. This phase is a standalone route, ML Printing–branded, with its own SEO, meant to be opened by a hundred wedding guests on their phones. Same data, same view model, different renderer, different audience.

**What does not change:** no field describing colour, font, or layout may be added anywhere outside `InvitationPersonalization`, and no invitation content may be duplicated into a website-specific table. If this phase finds itself wanting a field the dataset doesn't have, that is a Phase 3 gap to fix, not a reason to fork the data model.

---

## Deliverables

### 1. Public Website Route

- One route per invitation, reachable without authentication (guests are not ML-DEP accounts).
- URL keyed by a stable, non-guessable identifier — not the raw database `id` (an incrementing or otherwise enumerable identifier would let one guest browse another customer's private event by editing the URL).
- Rendered server-side from the same `toPreviewModel(input)` contract Phase 3 already exports, extended with whatever the live site needs that the in-app preview didn't (RSVP state, guest-facing metadata) as additions to the model, not a parallel resolution path.
- This route is **not yet** on a customer subdomain or custom domain — Ph8.md's per-order deployment pipeline owns domain mapping. This phase's output is a real, complete, published page; where it's finally hosted is Phase 8's concern.

### 2. Publish Control

- A website has exactly one of: not yet published, published (live, guest-visible), or unpublished (was live, customer took it down).
- Only a `COMPLETED` invitation (Ph3.md's `InvitationStatus`) can be published — a `DRAFT` must never be guest-visible, even at a guessable URL.
- Publishing is a customer action, not automatic on completion — finishing the builder and going live are different moments (the customer may want to review the real rendered page first).
- Unpublishing must not delete anything — it is a visibility flag, reversible, same invitation data underneath.

### 3. RSVP

- A public form: attending yes/no, guest name, number of guests, an optional message to the hosts.
- Stored against the invitation, visible to the customer (not yet specified where — likely a new dashboard surface reading this phase's RSVP records, scoped here to data collection only).
- Respects `Invitation.rsvpDeadline` — the form's availability, or at least its framing, follows the same deadline the website already displays (`PreviewModel.rsvpLine`).
- Explicitly **not** guest accounts, guest login, or a guest-facing dashboard — a guest submits once per visit; no identity is established beyond what they typed.

### 4. Countdown

- A live countdown to `Invitation.eventDate`, computed client-side in the visitor's browser (a server-rendered countdown is stale the instant it's rendered).
- Uses `Invitation.timeZone` for the target instant, same reasoning `preview/model.ts`'s `formatDate` already documents for date display — a countdown computed against the wrong zone reaches zero at the wrong moment for every visitor outside that zone.
- Hidden entirely once the event has passed, not frozen at zero.

### 5. Maps

- Embeds `InvitationVenue.mapsUrl` for each venue that has one (ceremony and/or reception).
- A venue with no `mapsUrl` shows its address as text (already in `PreviewModel.venues`), not a broken embed.

### 6. Gallery

- Renders `PreviewModel.galleryUrls` (already resolved from `InvitationMedia`'s `COUPLE`/`FAMILY` slots) as a real, full-size, guest-facing gallery — not the same thumbnail-sized treatment the in-app preview uses.
- Reuses `services/media`'s existing URL-resolution (Ph4's `thumbnailUrl`/`previewUrl`/proxy route) rather than inventing a second way to serve these images publicly. **Open question this phase must resolve:** the Ph4 proxy route requires an authenticated session (`getProfile()`); a guest has none. Serving a customer's private media bucket to an anonymous website visitor needs its own access decision — most likely a scoped, unguessable public variant of the existing serving route, not loosening the private-bucket policy itself.

### 7. QR Invitation

- Generates a QR code encoding the published website's URL.
- Available to the customer (dashboard) and plausibly printed on the physical invitation (Ph6, Print-ready PDF Generator) — this phase owns generating the code; whether/how it's embossed on the printed piece is Ph6's decision to make when that phase is designed.

### 8. SEO and Sharing Metadata

- Page title, description, and an Open Graph image (the cover photo) so a link shared in Messenger/WhatsApp/SMS shows a real preview card, not a bare URL.
- `robots` directives should keep unpublished/draft sites out of search indexing — a `DRAFT` invitation must never be crawlable even if the route itself already 404s or redirects for unauthenticated access.

### 9. Rendering Fidelity to the Approved Design System

- Colour, typography, background, and decorative style come from `InvitationPersonalization`'s approved-vocabulary slugs (`lib/config/design-vocabulary.ts`), resolved through the same `toPreviewModel` step Phase 3 already uses — never a hex value, never a raw font name, for the same reason Ph3.md §6 forbids it there.
- Section visibility (`PreviewModel.hidden` / `shows()`) is honoured identically to the in-app preview — a section the customer switched off must not reappear on the live site.

---

## UI Requirements

- Mobile-first: the primary audience is a guest opening a text-message link on a phone at a bar or in a car, not a customer at a desk.
- No ML-DEP dashboard chrome (no sidebar, no admin nav) — this is the customer's own event page, not a screen inside the platform.
- Loads fast and renders correctly with JavaScript partially blocked or slow (guests on event-day venue wifi) — the countdown and RSVP form may be interactive, but the core content (event details, venue, program) must not depend on client-side JS to be readable.
- Print styles are explicitly out of scope here — Ph6 (PDF Generator) owns the print output, and this phase's `@media print` behavior, if any, is incidental, not a deliverable.

---

## Out of Scope

- **Custom domains, subdomain mapping, SSL management** — Ph8.md's per-order deployment pipeline (§7 of that doc lists these as future-ready, gated on Phases 5–8 all existing first).
- **Print-ready PDF output** — Ph6.
- **Booking / order workflow** — Ph7.
- **Payment, GCash/QR receipt verification** — Ph8.
- **Guest accounts, guest photo/video uploads, Live Story Wall, Digital Memory Book** — explicitly deferred roadmap items (`raw/FDG Context Package (FCP)-comment 1.md` §11; V1.md §5).
- **QR Check-in** (scanning guests in at the venue) — a *different* QR feature from Deliverable 7's invitation-link QR code; deferred per V1.md §5 unless separately approved.
- **AI media enhancement, background removal** — deferred (Ph4.md's own Out of Scope already excluded this from the Media Library; it does not reappear here).
- **Analytics / view tracking** on the public site — not mentioned in any MVP-scope doc; would need its own approval before being added.
- **Multi-language rendering beyond what `Invitation.language` already drives** in `formatDate`/`formatTime` — no translated UI chrome, just locale-correct date/time formatting, matching what Phase 3 already built.

---

## Success Criteria

At the end of Phase 5:

✓ A completed, published invitation is reachable at a stable, unguessable public URL, rendered from the same view-model contract Phase 3 already exports — no duplicated content-resolution logic.

✓ A `DRAFT` invitation, or an unpublished one, is never guest-visible or search-indexed.

✓ RSVP submissions are collected and stored against the correct invitation.

✓ Countdown, Maps, and Gallery all render correctly from data already in the Ph1–4 schema — no new invitation-content fields introduced.

✓ The approved design system (colour/typography/background/decorative slugs) renders identically to the in-app preview's resolved values.

✓ A QR code for the published site is generated and retrievable.

✓ Page loads fast and is legible on mobile with degraded connectivity.

✓ Ready for Ph6 (PDF Generator) and Ph8 (per-order deployment) to build on this phase's output.

---

## Open Questions (flagged for the brainstorming pass, not resolved here)

1. **Guest media access.** Deliverable 6 needs a way to serve private-bucket photos to an unauthenticated guest. Does this warrant a new, scoped public route, a time-limited signed link per publish, or something else? This is the one deliverable in this draft with a real architectural decision still open.
2. **RSVP visibility to the customer.** Where do RSVP responses surface — a new dashboard page, an export, an email digest? Not specified above; needs its own decision.
3. **Slug/identifier scheme.** Random opaque id, customer-chosen slug, or both (a friendly slug that resolves to an opaque backing id)? Affects URL shareability and collision handling.
4. **Un-publish and re-publish semantics.** Does the public URL survive an unpublish/republish cycle unchanged, or can a customer regenerate it (e.g., if they accidentally shared it too early)?
