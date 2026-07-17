# Phase 4 — Invitation Media Library: Design

**Status:** Approved by user, pending write-up into an implementation plan.
**Source spec:** `raw/ML Digital Event Platform (ML-DEP) Ph4.md`.
**Builds on:** Phase 3's `MediaAsset` / `InvitationMedia` seam (`prisma/schema.prisma`),
`services/media/index.ts`, `services/upload/` (validation, constraints, Supabase Storage
wrapper), and the placeholder-art route pattern from Phase 2
(`app/api/placeholder/[surface]/[seed]/route.ts`).

## Objective

Ph4.md's FDG principle: **Capture Once, Reuse Everywhere**. Every uploaded asset must
be reusable across the Website Generator (Ph5), the PDF Generator (Ph6), previews,
and future consumers, without duplicate uploads. Phase 3 already built the minimum
seam this requires (`MediaAsset`, `InvitationMedia`, delete-protection). Phase 4 turns
that seam into the actual Media Library: folders, search, a real asset browser, image
processing, and a real Upload Manager.

## Resolved design decisions

These were open questions during brainstorming; each is settled and should not be
re-litigated during planning or implementation without coming back to this doc.

### 1. Folder model — computed, not stored

Ph4.md §2 wants assets "automatically organized by Event," but §9 requires that "multiple
invitation sections may reference the same asset" — one photo can belong to zero, one,
or many events. A literal folder-per-event model breaks the moment an asset is reused.

**Decision:** folders are **views computed at read time**, not a stored `Folder` table.

- **By event** — derived from `InvitationMedia`. Each invitation referencing at least one
  asset becomes a virtual folder named after it. Assets with zero references sit in
  "Unsorted." Within an event's view, assets sub-group by `MediaSlot` (Cover / Gallery /
  Logo), which already exists.
- **By type** — a `tags` value (see Decision 4), not a new structured category column.
  "background," "logo," "decorative" are tags, not schema.

Ph4.md's example nested tree (`Customer → Event → Cover Photos/Gallery/Logos/
Backgrounds/Other Assets`) is realized as *filtered views* over one flat asset pool
rather than a literal tree the customer clicks down through — closer to Google Photos'
model (albums/views) than a traditional file manager, which also matches the UI
Requirements section's explicit "resemble professional cloud storage rather than a
traditional file manager."

**Known judgment call:** §1 lists "Background Images" as a supported asset type, but
nothing in Phase 3's invitation model uses an uploaded photo as a background —
`InvitationPersonalization.backgroundStyle` is an abstract design-vocabulary slug, not
an image reference. A "background" tag today is purely organizational; nothing consumes
it functionally. This costs nothing to support and gives Ph5/Ph6 a hook if a real
custom-background-image feature appears later, but it is not wired to anything yet.

### 2. Replace Asset — in-place, version-number only, no history

§10 requires replacing an asset "while preserving references" ("every page using that
photo updates automatically"). Since every reference is by asset id (never a URL), the
only correct implementation is: **same id, new bytes, version incremented.** No new-row-
plus-repoint scheme is needed or wanted.

**Decision on depth:** `MediaAsset.version: Int` increments on every replace. The
previous version's storage objects (original + thumbnail + preview) are deleted once the
new version is confirmed written. **No version history is kept** — no revert, no
comparison. Nothing in Ph4, Ph5, Ph6, or Ph7 asks for either, and unbounded storage
growth from every re-upload would be pure speculation against a feature that doesn't
exist. If a future phase needs revert, that is a new decision made with actual
requirements in hand, not now.

### 3. Upload Manager — built for real

§3 requires drag-and-drop, multi-file upload, progress, retry, and cancel. This is a
materially larger client-side UI surface than anything in Phases 1–3 (which were mostly
server-rendered). **Decision:** build it fully now, matching the standard every prior
phase has held to — no stubs, verified for real where verification is possible. See the
"Upload Manager" implementation note under **UI**, below, for the one architectural
consequence of this choice (progress requires bypassing the Server Action pattern for
the actual upload call).

### 4. Image pipeline — proxy route + synchronous `sharp` processing at upload

Three options were considered for how an image gets from upload to screen:

- **(A, chosen)** Generate thumbnail + preview variants synchronously at upload time via
  `sharp` (free, self-hosted, no new paid service — consistent with V1 §11's cost
  policy), store them as sibling objects, and serve everything through an authenticated
  proxy route shaped like Phase 2's placeholder-art route:
  `/api/media/[assetId]/[version]/[variant]/route.ts`.
- **(B, rejected)** Keep today's Supabase signed URLs, no real thumbnails. Simplest, but
  signed URLs expire and rotate, so every page load mints a new one — `next/image`'s
  cache key churns constantly and a grid of dozens of thumbnails never gets fast. Doesn't
  literally satisfy §5's "generate thumbnails" either.
- **(C, rejected)** Serve via the proxy but generate thumbnails lazily on first request.
  Avoids adding latency to the upload call, but means the *first* view of something just
  uploaded — exactly when the customer is looking at the asset browser — is the slow one,
  and needs request-coalescing to avoid duplicate concurrent generation. No queue
  infrastructure exists in this codebase to make this comfortable.

**Why the version belongs in the URL path** (not just on the row): a specific
`(assetId, version, variant)` triple's bytes never change, because replace always writes
to `v{version + 1}` and only deletes the old version's objects afterward. That is what
makes `Cache-Control: immutable` safe. A stale/bookmarked URL pointing at a replaced
version's objects will 404 (they're deleted) — this is correct and expected, and never
happens from normal navigation since every page constructs the URL from the current
version in the database.

**Serving details:**
- Auth: session required, ownership checked (`mediaAsset.profileId` matches caller).
  Private media only — no public-bucket exception, unlike avatars.
- The route calls the existing `signedUrl()` helper from `services/upload/storage.ts`
  server-side, fetches the bytes, and streams them under our own headers. The Supabase
  host/token never reaches the browser.
- Headers: `Cache-Control: private, max-age=31536000, immutable`,
  `X-Content-Type-Options: nosniff`.
- Rendered as plain `<img>`, not `next/image` — we already generate the exact sizes
  needed, so a second optimization pass is redundant. Matches how Phase 3's preview
  already handles generated/signed URLs.

**Processing pipeline (per file, on upload):**
1. Validate against existing `services/upload` constraints (unchanged).
2. Decode with `sharp`; generate a 320px-longest-edge thumbnail and a 1280px-longest-edge
   preview, both re-encoded to WebP. Re-encoding is what strips EXIF/GPS metadata (§5) —
   a side effect of generating the thumbnail, not a separate step.
3. Read intrinsic width/height from the decode.
4. Write original + both derivatives to storage, then create the `MediaAsset` row.
5. If any step fails after bytes start landing, clean up what was written — extends the
   existing orphan-prevention pattern in `createAsset` (currently handles one object,
   needs to handle three).

**Graceful degradation:** HEIC (already accepted for upload since Phase 1) is not
reliably decodable by `sharp`'s default prebuilt binary — HEIF support depends on the
build. If step 2 fails on a file that passed validation, steps 3–4 still run for the
original alone: the row is created with no thumbnail/preview, and display falls back to
the original. This satisfies §5's "originals must always remain available" even when
processing can't happen. This is a genuine, currently-unresolved format-support gap
worth surfacing in the implementation plan, not a hidden failure mode.

Since there is no variants table (Decision 4 rejects one), "no thumbnail/preview exists"
needs a signal, and there is already a field that carries it for free: `width`/`height`
are only populated on a successful decode (unchanged from Phase 3, where they were
always null because nothing populated them). **`width IS NOT NULL` is the signal that
variants exist for this asset.** Any code building a URL for a thumbnail or preview
variant must check this first and fall back to the `original` variant when it's null,
rather than speculatively requesting a thumbnail path and handling a storage 404. No new
column, no ambiguity about which of two mechanisms is authoritative.

**Multi-file upload** runs this pipeline once per file, independently. One file failing
doesn't block or roll back the others — each has its own outcome, which is what lets the
Upload Manager show per-file progress and per-file retry (Decision 3) rather than an
all-or-nothing batch.

**Replace** runs the identical pipeline against the new file, writes under
`v{version + 1}`, updates the row, and only after that succeeds, deletes the previous
version's three objects.

All of this runs in a Node.js runtime (not Edge) — `sharp` is a native binary.

## Data model changes

`MediaAsset` gains:
- `tags: String[]` (default `[]`) — §6 metadata, §8 search, and Decision 1's "by type"
  view all use this one field.
- `version: Int` (default `1`) — bumped on replace (Decision 2); embedded in served URLs
  (Decision 4).

`MediaKind` enum gains `VIDEO` — future-ready per §1/§4, no processing behind it, same
treatment as `MediaSlot.MUSIC` from Phase 3.

**No new tables.** Not for folders (Decision 1 — computed). Not for variants (thumbnail/
preview are always generated together, at a fully predictable path derived from fields
already on the row — `{profileId}/{assetId}/v{version}/{variant}.{ext}` — so a table
would just track data that's already computable). Not for version history (Decision 2).

**Clarification on §6's "Event" metadata field:** derived at display time from
`InvitationMedia`, never stored — consistent with Decision 1. Storing it would create a
second, driftable copy of what the join table already knows.

## Folders, search, and quota

- **Folders:** see Decision 1. Implementation is a pure function taking a profile's
  assets + their `InvitationMedia` usages and grouping them into the by-event and
  by-type views described above.
- **Search (§8):** filename, tags, media type, upload date, and "used by event X" (a join
  against `InvitationMedia`, not a stored column). Follows the same pattern as
  `features/template-marketplace/criteria.ts` / `query.ts` from Phase 2: parse criteria
  from params, build a Prisma `where`/`orderBy`. Same `ILIKE`-only ceiling already
  documented as a known gap on the marketplace — semantic search (mentioned in §8 as a
  future direction) would replace this one query-building module, not trigger a rewrite.
- **Storage quota (§12):** one aggregate query — `SUM(bytes)`, `COUNT(*)`, grouped
  overall and per computed event-folder. Display only. No enforcement, no plan logic —
  matches "future subscription plans can use this information without architectural
  changes."

## UI

- **Asset Browser** replaces today's Phase-1 placeholder at `/dashboard/media`: grid/list
  toggle, search bar, filter/sort controls, and a view switcher (All / By Event / By
  Type) over the groupings above — same shape as Ph2's marketplace filter panel, adapted.
  Clicking an asset opens a detail panel: large preview, full metadata, "used in" list,
  and Replace/Delete actions. A quota summary sits at the top.
- **Upload Manager** (Decision 3): drag-and-drop dropzone + file picker, multi-select, a
  per-file queue (queued → uploading → done/error) with individual progress, retry, and
  cancel.
  - **Implementation note:** Server Actions don't expose upload progress events. The
    actual upload call must go through a route handler invoked via `XMLHttpRequest` (not
    `fetch`, which has no upload-progress event) to get real byte-level progress. This is
    the one place in the app that doesn't follow the Server Action pattern everything
    else uses, and it's a deliberate, scoped exception — not a precedent for abandoning
    Server Actions elsewhere.
- **Replace** reuses the same dropzone, scoped to one file, from the detail panel.
- **Delete** reuses the existing `deleteAsset` (Phase 3) — already returns which
  invitations block a delete; the confirm dialog renders what's already there.
- **Builder integration:** Phase 3's builder-embedded media picker
  (`features/invitation-builder/components/steps/media-step.tsx`) should be updated to
  browse the full library (search/filter included) rather than the flat list it shows
  today — this is the concrete realization of Ph3.md §7's "Connect to the Invitation
  Media Library."

## Error handling (cross-reference)

- Per-file upload failures don't block a batch (pipeline section, above).
- Processing failures degrade to original-only, never fail the whole upload (Decision 4).
- Delete-protection surfaces *why* a delete is blocked, not a generic refusal (already
  built in Phase 3; UI just needs to render it).
- Replace only deletes old storage objects after the new version is confirmed written —
  never the reverse order.

## Testing approach

Unlike Phase 3's builder, this phase's core processing is genuinely testable without a
browser or database: `sharp` needs neither. Real image bytes in, assert correct
thumbnail/preview dimensions, assert metadata stripped, assert the graceful-failure path
for undecodable input (simulating the HEIC gap) — all as ordinary unit tests.

Also unit-testable without a DB: the path-builder functions, version-bump logic, virtual
folder computation, and the search criteria/query builder (mirroring Ph2's test
coverage for the same pattern).

Real-Postgres verification via `pnpm db:local` (established pattern from Phases 2–3):
full asset lifecycle — upload creates row + variants, replace bumps version and removes
the old objects, delete-protection blocks/allows correctly, cascades on profile
deletion, ownership scoping holds on both the Server Actions and the proxy route.

**Known limitation, stated up front:** the interactive parts — actual drag-and-drop,
live progress bars, cancel mid-upload — need a signed-in browser session. Supabase still
isn't configured in this environment (same gap Phase 3 flagged for its builder UI; not
new to this phase).

## Out of scope

Matches Ph4.md's own Out of Scope section, plus judgment calls made during this design:

- Website generation, PDF generation (Ph5/Ph6 — this library is consumed by them, does
  not build them).
- AI image enhancement, background removal, AI editing (explicit in spec).
- Video editing (explicit in spec).
- Functional upload support is **images only** this phase (JPG/JPEG/PNG/WEBP/HEIC).
  `DOCUMENT`/`AUDIO`/`VIDEO` exist as `MediaKind` values with no upload path through the
  Media Library UI — future-ready seam only.
- SVG — not supported, same reasoning as Phase 1 (stored-XSS risk without a sanitizer).
- Sharing/collaboration — assets are strictly single-owner; no team libraries.
- Quota enforcement — numbers are informational only; nothing blocks an upload at a cap.
- Version history / revert (Decision 2).

## API contract for future consumers (§15)

`services/media` (exists since Phase 3, extended here — not replaced) remains the only
module Ph5, Ph6, a future mobile app, or future AI services would ever call: resolve an
asset, get a URL for a variant, list what an invitation uses. It imports nothing from
`features/`; every other module depends on it, never the reverse. This is already true
today; Phase 4 only needs to keep it true as the surface grows.
