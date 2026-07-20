# Phase 6 — Print-ready PDF Generation Engine: Design

**Status:** Approved by user, pending write-up into an implementation plan.
**Source spec:** `raw/ML Digital Event Platform (ML-DEP) Ph6.md`.
**Builds on:** Phase 3's invitation dataset and `lib/invitation/preview-model.ts`
(`toPreviewModel`), Phase 4's `services/media` (original assets, `sharp`), Phase 5's
publish-control page pattern, and `lib/config/design-vocabulary.ts`.

## Objective

Turn a completed invitation into a press-ready, two-sided PDF that ML Printing can send
to a commercial press without any manual desktop publishing. The engine reads customer
data and never modifies it.

## Resolved design decisions

Settled during brainstorming. Do not re-litigate during planning or implementation
without returning to this doc.

### 1. True CMYK output — required, and achievable without paid tooling

The user confirmed the press needs genuinely CMYK-separated files, not RGB. This single
answer drives most of the architecture.

**Consequence:** headless-Chrome HTML→PDF (Puppeteer/Playwright) is ruled out — Chrome
only ever emits RGB. We therefore build the layout programmatically rather than reusing
the web renderer.

**Verified before committing to this path:**
- `pdf-lib` exposes `cmyk(c, m, y, k)` for text, shapes, borders, and SVG paths —
  confirmed in its published docs and its own test suite.
- `sharp` converts images to true 4-channel CMYK JPEG — confirmed empirically in this
  repo (`space: cmyk, channels: 4`). `sharp` is already a dependency from Phase 4.

**One unverified risk, carried into the plan deliberately:** whether `pdf-lib`'s
`embedJpg` accepts a 4-component CMYK JPEG. Its documentation does not say. The
implementation plan's **first task is a spike** proving this end to end. If it fails, the
documented fallback is to embed images as CMYK-converted **PNG/raw** or, failing that, to
ship photos as RGB inside an otherwise-CMYK document and state that limitation plainly to
the user — a mixed-colourspace PDF that most digital presses still accept. We do not
discover this during layout work.

**Rejected:** Ghostscript (native binary, awkward on Vercel's serverless filesystem) and
paid SDKs such as Apryse/PSPDFKit (V1.md §11 forbids introducing paid services without
explicit approval).

### 2. Layout expressed as typed, size-parameterised functions

Page sizes are **data**; the arrangement is **code**. A layout function takes a page spec
plus the resolved model and returns draw instructions.

**Rejected:** a data-driven layout descriptor language (building a text-measurement and
wrapping interpreter before drawing a single card, to serve one design family — textbook
speculative generality), and an SVG intermediate (no text wrapping either, and awkward
CMYK).

This matches Deliverable 2 exactly: the extensibility the spec asks for is **more paper
sizes**, which this makes a table entry. It never asks for arbitrary user-authored
layouts.

### 3. Two-sided card

- **Front:** hosts, event title/subtitle, date, time, venue, invitation message.
- **Back:** parents, principal sponsors, programme, dress code, gifts, notes, RSVP line.

Chosen over a single side because a Filipino invitation traditionally names parents and
principal sponsors — the schema already models them (`PartyGroup`) — and cramming them
onto one face produces either a wall of small type or silent omission. Deliverable 7
already asks the architecture to support front/back.

Sections the customer switched off in the builder (`PreviewModel.hidden` / `shows()`)
stay off in print, exactly as on the website.

### 4. Open-licensed fonts, replacing the current vocabulary

Deliverable 5 requires embedded fonts with licensing compliance. The current vocabulary
uses `Georgia`, `'Helvetica Neue'`, and `'Brush Script MT'` — Microsoft/Apple system
fonts that **cannot legally be embedded** in a PDF handed to a print shop.

All four typography pairings move to SIL Open Font License families, chosen to stay close
to the present look:

| Slug | Now (unembeddable) | Becomes (SIL OFL) |
|---|---|---|
| `classic-serif` | Georgia | **Lora** |
| `modern-sans` | Helvetica Neue | **Inter** |
| script pairing | Brush Script MT + Georgia | **Great Vibes** + Lora |
| serif/sans pairing | Georgia + Helvetica Neue | **Playfair Display** + Inter |

Font files are committed to the repo and **also served as webfonts**, so the builder
preview (Phase 3) and the public website (Phase 5) change to match the print output.
Screen and print agree — the point of "Design Once, Deliver Everywhere". This is a
visible change to already-shipped surfaces and is intentional.

### 5. CMYK authored directly in the design vocabulary

Naive hex→CMYK conversion without an ICC profile is guesswork, and guesswork is expensive
when it reaches a press. But the palette is a **curated, fixed vocabulary**, not a colour
picker (`design-vocabulary.ts` exists precisely to prevent free colour choice).

So each colour theme gains explicit CMYK values alongside its existing hex swatch. Print
uses the CMYK; screen keeps the hex. Exact, no conversion step, and ML Printing can tune
any value to their own press without touching drawing code.

## Data model changes

```prisma
enum PdfPageSize {
  FIVE_BY_SEVEN
  A5
  A6
}

enum PdfGenerationStatus {
  PENDING
  READY
  FAILED
}

/// One generated print file — Ph6.md §11 (traceability), §12 (version history).
/// Rows are never overwritten: each generation appends, so a superseded file
/// remains downloadable until deliberately pruned.
model PdfGeneration {
  id           String @id @default(uuid()) @db.Uuid
  invitationId String @db.Uuid

  /// Increments per invitation. Not a storage path component's only identity —
  /// the id is — but what a human refers to ("version 3").
  version   Int
  pageSize  PdfPageSize
  status    PdfGenerationStatus @default(PENDING)

  /// Null until status is READY.
  storagePath String?
  bytes       Int?

  /// Ph6.md §11 — production traceability, also embedded in the PDF itself.
  generatorVersion String
  templateVersion  String?

  /// The validation report as returned at generation time (Ph6.md §9, §15).
  validationReport Json?
  error            String?

  createdAt DateTime @default(now())

  invitation Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  @@index([invitationId, createdAt])
  @@map("pdf_generations")
}
```

`Invitation` gains `pdfGenerations PdfGeneration[]`. No other Phase 1–5 model changes.
Generated PDFs are stored in a **private** Supabase bucket, served through an
authenticated route — the same posture as Phase 4 media, never a public URL.

## Architecture

`services/pdf/` — server-only, imports no feature, the only module that knows how a PDF
is built. Mirrors `services/media/`'s shape.

| Module | Responsibility | Pure? |
|---|---|---|
| `page-specs.ts` | 5×7 / A5 / A6: trim, bleed, safe margin, in PDF points | yes |
| `colour.ts` | design-vocabulary slug → CMYK tuple | yes |
| `fonts.ts` | typography slug → embedded font file bytes | no (fs) |
| `text.ts` | measure, wrap, detect overflow using real font metrics | yes |
| `images.ts` | fetch original, validate DPI, convert to CMYK via sharp | no |
| `layout/front.ts`, `layout/back.ts` | model + page spec → draw instructions | yes |
| `render.ts` | pdf-lib assembly, crop marks, document metadata | no |
| `validate.ts` | Deliverable 9 pre-flight checks | mostly |
| `repository.ts` | Prisma access to `PdfGeneration` | no |
| `index.ts` | public barrel | — |

Everything below `render.ts` is pure and unit-testable **without producing a PDF** — which
is what makes this phase testable at all.

Then `features/pdf-generation/` (Server Actions + UI) and
`app/api/pdf/[generationId]/route.ts` (authenticated download).

### The seam with earlier phases

Print reuses `toPreviewModel` — the same view model the builder preview and the live
website use — for **all text content**. That is "Design Once, Deliver Everywhere" made
real rather than asserted.

It deliberately does **not** use that model for two things:

- **Colour and fonts.** `PreviewModel.style` carries hex and CSS font stacks, which are
  meaningless to a press. Print resolves the same design slugs into CMYK and font files
  instead.
- **Images.** `PreviewModel` carries proxy URLs pointing at 1280px previews — far below
  300 DPI. Print reads `MediaAsset` rows directly and pulls **originals** from storage.

So the layout functions take two inputs: the resolved text model, and the raw asset rows.

### Page geometry

Trim sizes: 5×7in = 360×504pt; A5 = 419.53×595.28pt; A6 = 297.64×419.53pt (72pt/inch).
Bleed 3mm (≈8.5pt) on all edges; safe margin 5mm inside trim. Crop marks drawn in the
bleed area, configurable per Deliverable 3. Nothing meaningful is placed outside the safe
area; background fills extend to full bleed.

### Image pipeline

1. Read the `MediaAsset` original from storage (never the thumbnail or preview variant).
2. Compute required pixels: placement box in inches × 300.
3. Compare against the asset's stored `width`/`height` (Phase 4 records these). Below
   requirement → a validation issue, severity per §Validation below.
4. `sharp`: cover-crop to the box's aspect ratio, resize to the required pixel size,
   convert to CMYK, encode JPEG.
5. Embed. Aspect ratio is always preserved (Deliverable 6); cropping fills the box.

## Validation (Deliverable 9)

Runs before generation and returns a structured report. **Blocking** issues stop
generation; **warnings** are surfaced but allow it.

| Issue | Severity |
|---|---|
| Missing required field (reuses Phase 3 `completionErrors`) | blocking |
| Text overflow beyond its box | blocking |
| Missing font file for the chosen typography | blocking |
| Image below 300 DPI at its placement size | blocking |
| Image between 200–300 DPI | warning |
| No cover image | warning |
| Back side would be empty (all its sections hidden/empty) | warning |

The report is persisted on the `PdfGeneration` row (Deliverables 9 and 15) so a failed
attempt explains itself later, rather than only in a log nobody reads.

## UI (Deliverable 8)

A "Print file" page on a completed invitation, reached the same way Phase 5's "Manage
website" is — a `DraftMenu` entry gated on `status === "COMPLETED"`, linked through the
shared route registry, never a cross-feature import.

Flow: pick a size → validation report → **Generate** → preview and download, with the
generation history listed beneath.

Preview embeds the produced PDF in an `<iframe>`, using the browser's native PDF viewer.
That delivers Deliverable 8's zoom and page navigation for free. Building a custom
pdf.js viewer to re-implement what the browser already does is out of scope. The
"resolution check" part of Deliverable 8 is served by the validation report shown
alongside, not by the viewer.

## Testing approach

Unit-tested without a database or a PDF: `page-specs` geometry, `colour` mapping, `text`
measurement/wrapping/overflow, `validate`'s decision logic, and the `layout/*` draw
instructions (assert on the returned instruction list — position, size, colour — which is
why layout returns data rather than drawing directly).

Verified manually against a real database and real assets: generation end to end, CMYK
output inspected in a PDF reader's output-preview, DPI validation against genuinely
low-resolution uploads, and the download route's ownership check.

**Stated limitation:** nothing here proves the file prints correctly on ML Printing's
actual press. The first real print run is the acceptance test, and it should happen before
this is offered to a customer.

## Out of scope

Per Ph6.md's own Out of Scope, plus decisions made here:

- Printing hardware integration, shipping, production scheduling, payment, customer
  notifications — later phases.
- Multi-page beyond front/back. The architecture supports more pages; the MVP produces
  two.
- Paper sizes beyond 5×7, A5, A6.
- Export formats beyond PDF.
- ICC profile management and colour-managed soft proofing. Colour is exact-by-authoring
  (Decision 5), not profile-converted.
- A custom in-app PDF viewer.
- Regenerating automatically when content changes. Deliverable 12 requires *tracking*
  history and regenerating on demand; automatic regeneration on every edit would burn work
  on drafts nobody ordered.

## API contract for future consumers (Deliverable 14)

`services/pdf` is the only module Ph7 (Booking) and Ph8 (Production Workflow) call to
obtain a print file: request a generation, read its status, fetch the stored file. The
engine stays independent of ordering and payment, exactly as Ph6.md §14 requires.
