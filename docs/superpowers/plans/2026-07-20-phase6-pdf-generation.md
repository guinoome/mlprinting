# Phase 6 Print-ready PDF Generation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a completed invitation into a press-ready, two-sided CMYK PDF with bleed,
crop marks, embedded fonts, and 300 DPI imagery — per
`docs/superpowers/specs/2026-07-20-phase6-pdf-generation-design.md`.

**Architecture:** A new `services/pdf/` service builds the document programmatically with
`pdf-lib` (CMYK colour) and `sharp` (CMYK images). Page sizes are data; layout is code.
Everything below `render.ts` is pure and unit-testable without producing a PDF. Text
content reuses `toPreviewModel` — the same view model as the builder preview and the
public website — while colour, fonts, and images resolve differently for print.

**Tech Stack:** Next.js 14 (App Router), Prisma 6, PostgreSQL, `pdf-lib` (new), `sharp`
(existing), `@fontsource/*` font files (new, SIL OFL), Vitest.

## Global Constraints

- **True CMYK output.** Text, rules and fills use `pdf-lib`'s `cmyk()`. Images are
  converted to CMYK by `sharp` before embedding. No RGB colour may reach the page.
- **Body text is K-only where the theme's foreground is neutral.** Four-colour black at
  small sizes misregisters on press and prints fuzzy. Neutral foregrounds must resolve to
  `cmyk(0, 0, 0, k)`.
- Every server-only module starts with `import "server-only";`.
- Every Prisma-backed read degrades to an empty/null result when `isDatabaseConfigured()`
  is false — never throws. CI builds without a database.
- `services/pdf` imports **no feature**. `features/pdf-generation` and
  `features/invitation-builder` never import each other; they meet through the shared
  route registry, as Phase 5 established.
- Generated PDFs live in a **private** bucket, served only through an authenticated,
  ownership-checked route. Never a public URL.
- Nothing is placed outside the safe area; background fills extend to full bleed.
- No test may require a live database or produce a real PDF in CI. Pure logic
  (page-specs, colour, text measurement, layout instructions, validation) is unit-tested.
  Byte-level output is verified manually.

---

## File Structure

```
prisma/
  schema.prisma                                   (modify — PdfGeneration + 2 enums)
  migrations/<ts>_phase6_pdf_generation/migration.sql (create)

assets/fonts/                                     (create — committed .ttf files, SIL OFL)
  CrimsonText-Regular.ttf, CrimsonText-Bold.ttf, CrimsonText-Italic.ttf
  Lato-Regular.ttf, Lato-Bold.ttf, Lato-Italic.ttf
  Spectral-Regular.ttf, Spectral-Bold.ttf
  GreatVibes-Regular.ttf
  OFL-crimsontext.txt, OFL-lato.txt, OFL-spectral.txt, OFL-greatvibes.txt
                                                  (one licence per family, as OFL requires)

lib/config/
  design-vocabulary.ts   (modify — CMYK per theme, print font families per pairing)
  routes.ts              (modify — dashboard.eventPrint)
  features.ts            (modify — pdfGeneration flag)
.env.example             (modify)

services/pdf/
  types.ts            (create)
  page-specs.ts       (create) + page-specs.test.ts
  colour.ts           (create) + colour.test.ts
  text.ts             (create) + text.test.ts
  fonts.ts            (create)
  images.ts           (create)
  layout/front.ts     (create) + layout/front.test.ts
  layout/back.ts      (create) + layout/back.test.ts
  render.ts           (create)
  validate.ts         (create) + validate.test.ts
  paths.ts            (create) + paths.test.ts
  repository.ts       (create)
  index.ts            (create — the barrel; nothing outside imports past it)

lib/invitation/
  completeness.ts     (move — from features/invitation-builder/, + its test)

features/pdf-generation/
  generate.ts         (create — the orchestrator)
  actions.ts          (create)
  components/print-panel.tsx (create)

app/api/pdf/[generationId]/route.ts               (create — authenticated download)
app/(dashboard)/dashboard/events/[id]/print/page.tsx (create)

features/invitation-builder/components/draft-menu.tsx (modify — "Print file" entry)
docs/print-pipeline.md                            (create)
docs/architecture.md                              (modify — module map)
docs/development-workflow.md                      (modify — committed fonts)
CHANGELOG.md                                      (modify)
```

---

### Task 1: Spike — prove pdf-lib can embed a CMYK JPEG

**Files:**
- Modify: `package.json` (add `pdf-lib`, `@pdf-lib/fontkit`)
- Create: `services/pdf/spike-cmyk.md` (findings, deleted at the end of the phase)

This is first because the whole design rests on it and its failure changes later tasks.
The design doc records the fallback; this task decides which path the phase takes.

**Interfaces:** none — this task produces a documented finding and a dependency.

- [ ] **Step 1: Add the dependency**

```bash
pnpm add pdf-lib @pdf-lib/fontkit
```

Expected: both appear under `"dependencies"` (used at runtime by a Route Handler, not just
in tests). `@pdf-lib/fontkit` is not optional — pdf-lib refuses to embed a custom TTF
without it, and every typeface this phase uses is a custom TTF.

- [ ] **Step 2: Write a throwaway probe at the repo root**

Create `cmyk-spike.mjs` in the repo root (root, not `/tmp` — `node_modules` will not
resolve elsewhere; this file is deleted in Step 4):

```javascript
import { PDFDocument, cmyk } from "pdf-lib";
import sharp from "sharp";
import { writeFileSync } from "node:fs";

// A synthetic photo, converted to true 4-channel CMYK.
const rgb = await sharp({
  create: { width: 600, height: 400, channels: 3, background: { r: 210, g: 90, b: 60 } },
}).jpeg().toBuffer();

const cmykJpeg = await sharp(rgb).toColourspace("cmyk").jpeg({ quality: 90 }).toBuffer();
const meta = await sharp(cmykJpeg).metadata();
console.log("image space:", meta.space, "channels:", meta.channels);

const doc = await PDFDocument.create();
const page = doc.addPage([360, 504]);
page.drawRectangle({ x: 0, y: 0, width: 360, height: 504, color: cmyk(0, 0.02, 0.05, 0.04) });
page.drawText("CMYK spike", { x: 40, y: 450, size: 24, color: cmyk(0, 0, 0, 1) });

let embedded = null;
try {
  embedded = await doc.embedJpg(cmykJpeg);
  page.drawImage(embedded, { x: 40, y: 120, width: 280, height: 187 });
  console.log("RESULT: embedJpg ACCEPTED a 4-channel CMYK JPEG");
} catch (error) {
  console.log("RESULT: embedJpg REJECTED CMYK JPEG →", error.message);
}

writeFileSync("cmyk-spike.pdf", await doc.save());
console.log("wrote cmyk-spike.pdf");
```

- [ ] **Step 3: Run it and record what actually happened**

```bash
node ./cmyk-spike.mjs
```

Expected: prints `image space: cmyk channels: 4`, then either ACCEPTED or REJECTED.

Then open `cmyk-spike.pdf` and confirm the page renders (background fill, black text, and
the photo if it embedded). If you have Acrobat, use Output Preview to confirm the
separations are CMYK; if not, note that as unverified.

- [ ] **Step 4: Write up the finding and clean up**

Write `services/pdf/spike-cmyk.md` recording: the exact console output, whether the image
embedded, whether the PDF opened correctly, and **which path Task 9 must take**:

- **ACCEPTED** → `images.ts` converts to CMYK JPEG and embeds directly. Proceed as designed.
- **REJECTED** → try `sharp(...).toColourspace("cmyk").png()` with `embedPng`; record the
  result. If PNG also fails, the fallback is: embed images as **RGB** while keeping all
  text and vector colour CMYK, and add a line to the phase's known limitations stating
  that photos are RGB in an otherwise-CMYK document. **Do not silently proceed** — if it
  comes to this, stop and report it, because the user chose CMYK deliberately.

```bash
rm -f cmyk-spike.mjs cmyk-spike.pdf
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml services/pdf/spike-cmyk.md
git commit -m "spike(pdf): determine whether pdf-lib can embed CMYK JPEGs"
```

---

### Task 2: Schema — `PdfGeneration`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_phase6_pdf_generation/migration.sql`

**Interfaces:**
- Produces: `PdfGeneration`, `PdfPageSize`, `PdfGenerationStatus`, and
  `Invitation.pdfGenerations` — consumed by Tasks 12, 14, 15, 16.

- [ ] **Step 1: Append the enums and model**

Add at the end of `prisma/schema.prisma`:

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
///
/// Rows are appended, never overwritten: a superseded file stays downloadable,
/// which is what "preserve previous versions when required" asks for. The
/// engine never touches customer data — this table is the only thing it writes.
model PdfGeneration {
  id           String @id @default(uuid()) @db.Uuid
  invitationId String @db.Uuid

  /// Increments per invitation. What a human means by "version 3".
  version  Int
  pageSize PdfPageSize
  status   PdfGenerationStatus @default(PENDING)

  /// Null until status is READY.
  storagePath String?
  bytes       Int?

  /// Ph6.md §11. generatorVersion is a constant exported by services/pdf,
  /// bumped by hand when a layout change would alter output for unchanged
  /// input — that is what makes "reproducible from the same inputs" checkable.
  /// templateVersion copies Template.version at generation time.
  generatorVersion String
  templateVersion  String?

  /// The report as returned at generation time (Ph6.md §9, §15), so a failed
  /// attempt still explains itself later rather than only in a log.
  validationReport Json?
  error            String?

  createdAt DateTime @default(now())

  invitation Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  @@index([invitationId, createdAt])
  @@map("pdf_generations")
}
```

- [ ] **Step 2: Add the relation to `Invitation`**

In the `Invitation` model's relation block, after `rsvps RsvpResponse[]`, add:

```prisma
  pdfGenerations  PdfGeneration[]
```

- [ ] **Step 3: Generate and apply the migration**

`prisma migrate dev` is confirmed broken against this project's local PGlite database (a
wire-protocol incompatibility in its schema-engine diagnostic RPC — diagnosed in Phase 4).
Use `migrate diff` + `migrate deploy`, never `migrate dev`:

```bash
pnpm db:local
```

Then, in another shell:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres?pgbouncer=true&connection_limit=1" \
  npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/phase6-diff.sql
```

Expected: two `CREATE TYPE` statements and one `CREATE TABLE "pdf_generations"` with a
foreign key and the composite index. Nothing destructive. If this errors the same way
`migrate dev` does, hand-author the SQL, matching the style of
`prisma/migrations/20260719175630_phase5_website_generator/migration.sql`.

Create `prisma/migrations/<YYYYMMDDHHmmss>_phase6_pdf_generation/migration.sql` with that
SQL (timestamp later than the Phase 5 migration), then:

```bash
pnpm prisma:deploy
pnpm prisma:generate
```

Expected: both exit 0; the client now types `PdfGeneration`, `PdfPageSize`,
`PdfGenerationStatus`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(pdf): add PdfGeneration model for print-file history"
```

---

### Task 3: Routes, feature flag, env

**Files:**
- Modify: `lib/config/routes.ts`, `lib/config/features.ts`, `.env.example`

**Interfaces:**
- Produces: `routes.dashboard.eventPrint(id)`, `features.pdfGeneration` — consumed by
  Tasks 16, 17, 18.

- [ ] **Step 1: Add the route**

In `lib/config/routes.ts`, inside the `dashboard` object after `eventRsvps`:

```typescript
    /** Print file — Ph6.md's PDF generation surface. */
    eventPrint: (id: string) => `/dashboard/events/${id}/print`,
```

- [ ] **Step 2: Repoint the existing flag**

`lib/config/features.ts` already has a `pdfGeneration` getter reading
`NEXT_PUBLIC_FEATURE_PDF_GENERATION` — Phase 1 reserved it. Leave it exactly as is; this
phase simply starts using it. Verify it reads:

```typescript
  /** Ph6 — PDF Generation */
  get pdfGeneration() {
    return flag("NEXT_PUBLIC_FEATURE_PDF_GENERATION");
  },
```

`.env.example` already lists `NEXT_PUBLIC_FEATURE_PDF_GENERATION=`. No change needed —
confirm both and move on.

- [ ] **Step 3: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add lib/config/routes.ts
git commit -m "feat(pdf): add the print-file dashboard route"
```

---

### Task 4: Fonts — commit SIL OFL files and the loader

**Files:**
- Create: `assets/fonts/*.ttf` (9 files) and four per-family `assets/fonts/OFL-*.txt`
- Create: `services/pdf/fonts.ts`

Deliverable 5 requires embedded fonts with licensing compliance. The current vocabulary
names Georgia, Helvetica Neue and Brush Script MT — system fonts that cannot legally be
embedded in a distributed PDF. These four families are SIL Open Font License, which
explicitly permits embedding and commercial use.

**The families are Crimson Text, Lato, Spectral and Great Vibes — not Lora, Inter and
Playfair Display.** Those three now ship from `google/fonts` as *variable* fonts only
(`Lora[wght].ttf`, `Inter[opsz,wght].ttf`, `PlayfairDisplay[wght].ttf`); there are no
static `-Regular` / `-Bold` files to fetch. That matters beyond a broken URL: pdf-lib
embeds a variable font's **default instance**, so a "Bold" face would silently render at
Regular weight — invisible in review, obvious on paper, after the print run. The four
families below still ship real static cuts, verified by download.

**Interfaces:**
- Produces: `PrintFontFamily`, `fontFilesFor(typographySlug)`, `loadFontBytes(file)` —
  consumed by Tasks 8 (metrics), 12 (embedding), 13 (validation).

- [ ] **Step 1: Fetch the font files**

Download from Google Fonts (all SIL OFL) into `assets/fonts/`:

```bash
mkdir -p assets/fonts
cd assets/fonts
B="https://github.com/google/fonts/raw/main/ofl"
for f in \
  crimsontext/CrimsonText-Regular.ttf \
  crimsontext/CrimsonText-Bold.ttf \
  crimsontext/CrimsonText-Italic.ttf \
  lato/Lato-Regular.ttf \
  lato/Lato-Bold.ttf \
  lato/Lato-Italic.ttf \
  spectral/Spectral-Regular.ttf \
  spectral/Spectral-Bold.ttf \
  greatvibes/GreatVibes-Regular.ttf ; do
  curl -sL -o "$(basename $f)" "$B/$f"
done
for d in crimsontext lato spectral greatvibes; do
  curl -sL -o "OFL-$d.txt" "$B/$d/OFL.txt"
done
cd ../..
```

- [ ] **Step 1b: Verify every file is actually a font — do not skip this**

```bash
cd assets/fonts
for f in *.ttf; do printf "%-30s %s\n" "$f" "$(head -c 4 "$f" | xxd -p)"; done
cd ../..
```

Expected: **all nine print `00010000`**, the TrueType magic number. Anything else — most
commonly `0a0a0a0a`, which is `<!DOCTYPE`, a GitHub 404 page saved under a `.ttf` name — 
means that download failed. A 404 page is roughly 311 KB, so a size check alone does not
catch it; two "different" families arriving at byte-identical sizes is the tell. Re-fetch
any file that fails and re-run this check before continuing. A silently-corrupt font here
surfaces as an unreadable PDF several tasks later, with nothing pointing back to this step.

- [ ] **Step 2: Write `services/pdf/fonts.ts`**

```typescript
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Embedded print fonts — Ph6.md §5.
 *
 * All four families are SIL Open Font License, which permits embedding and
 * commercial use. The vocabulary's previous fonts (Georgia, Helvetica Neue,
 * Brush Script MT) are system fonts licensed to the OS vendor: legal to
 * display, not legal to embed in a PDF handed to a print shop. That is the
 * whole reason this file exists.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

export interface PrintFontSet {
  /** Filenames within assets/fonts. */
  headingRegular: string;
  headingBold: string;
  bodyRegular: string;
  bodyBold: string;
  bodyItalic: string;
}

/**
 * Typography slug → font files. Mirrors TYPOGRAPHY_SETS in
 * lib/config/design-vocabulary.ts; a slug missing here is a blocking
 * validation issue rather than a silent fallback, because a substituted
 * typeface on a printed invitation is not a small surprise.
 */
const FONT_SETS: Record<string, PrintFontSet> = {
  "classic-serif": {
    headingRegular: "CrimsonText-Regular.ttf",
    headingBold: "CrimsonText-Bold.ttf",
    bodyRegular: "CrimsonText-Regular.ttf",
    bodyBold: "CrimsonText-Bold.ttf",
    bodyItalic: "CrimsonText-Italic.ttf",
  },
  "modern-sans": {
    headingRegular: "Lato-Regular.ttf",
    headingBold: "Lato-Bold.ttf",
    bodyRegular: "Lato-Regular.ttf",
    bodyBold: "Lato-Bold.ttf",
    bodyItalic: "Lato-Italic.ttf",
  },
  "elegant-script": {
    // Great Vibes ships one weight only. Mapping bold to the same file is
    // deliberate: a script face has no bold cut, and faking one by embedding
    // the regular under a "bold" name would be a lie the renderer acts on.
    headingRegular: "GreatVibes-Regular.ttf",
    headingBold: "GreatVibes-Regular.ttf",
    bodyRegular: "CrimsonText-Regular.ttf",
    bodyBold: "CrimsonText-Bold.ttf",
    bodyItalic: "CrimsonText-Italic.ttf",
  },
  "editorial-mix": {
    headingRegular: "Spectral-Regular.ttf",
    headingBold: "Spectral-Bold.ttf",
    bodyRegular: "Lato-Regular.ttf",
    bodyBold: "Lato-Bold.ttf",
    // Spectral and Crimson Text both ship italics; Lato's is the one that
    // pairs with the body face above.
    bodyItalic: "Lato-Italic.ttf",
  },
};

/** Null when the slug has no mapping — the caller turns that into a blocking issue. */
export function fontFilesFor(typographySlug: string): PrintFontSet | null {
  return FONT_SETS[typographySlug] ?? null;
}

export async function loadFontBytes(fileName: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(FONT_DIR, fileName)));
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add assets/fonts services/pdf/fonts.ts
git commit -m "feat(pdf): add SIL OFL print fonts and the font loader"
```

---

### Task 5: Design vocabulary — CMYK values and print font families

**Files:**
- Modify: `lib/config/design-vocabulary.ts`

Design doc Decision 5: the palette is a curated vocabulary, not a colour picker, so CMYK
is **authored** rather than converted. Naive hex→CMYK without an ICC profile is guesswork,
and guesswork is expensive at a press.

**This visibly changes already-shipped surfaces.** The builder preview (Phase 3) and the
public website (Phase 5) both read `preview.heading` / `preview.body`, so swapping those
stacks changes how they look. That is intentional — screen and print must agree.

**Interfaces:**
- Produces: `ColorThemeOption.cmyk`, `TypographyOption.preview` (new families) — consumed
  by Task 7 (`colour.ts`) and the existing preview/website renderers.

- [ ] **Step 1: Extend `ColorThemeOption`**

Change the interface:

```typescript
export interface ColorThemeOption extends DesignOption {
  /** Swatch preview only — the record stores the slug. */
  swatch: { background: string; foreground: string; accent: string };
  /**
   * Press values — Ph6.md §4. Authored, not converted: an uncalibrated
   * hex→CMYK conversion is a guess, and this palette is fixed and small
   * enough to state exactly. Tune these to ML Printing's own press without
   * touching any drawing code.
   *
   * Components are 0–1, matching pdf-lib's cmyk().
   */
  cmyk: {
    background: [number, number, number, number];
    foreground: [number, number, number, number];
    accent: [number, number, number, number];
  };
}
```

- [ ] **Step 2: Add `cmyk` to all seven themes**

Add this key to each entry, alongside its existing `swatch`:

```typescript
// classic-ivory
    cmyk: {
      background: [0, 0.02, 0.05, 0.04],
      foreground: [0, 0, 0, 0.78],
      accent: [0, 0.19, 0.81, 0.21],
    },
// blush-rose
    cmyk: {
      background: [0, 0.04, 0.03, 0.03],
      foreground: [0, 0.22, 0.15, 0.71],
      accent: [0, 0.3, 0.22, 0.21],
    },
// sage-garden
    cmyk: {
      background: [0.02, 0, 0.01, 0.05],
      foreground: [0.19, 0, 0.05, 0.77],
      accent: [0.22, 0, 0.08, 0.36],
    },
// midnight-navy
    cmyk: {
      background: [0.44, 0.25, 0, 0.78],
      foreground: [0, 0.02, 0.05, 0.04],
      accent: [0, 0.19, 0.81, 0.21],
    },
// burgundy-velvet
    cmyk: {
      background: [0, 0.02, 0.02, 0.03],
      foreground: [0, 0.53, 0.46, 0.71],
      accent: [0, 0.66, 0.59, 0.45],
    },
// coral-fiesta
    cmyk: {
      background: [0, 0.03, 0.07, 0],
      foreground: [0, 0.28, 0.36, 0.74],
      accent: [0, 0.5, 0.6, 0.11],
    },
// monochrome
    cmyk: {
      background: [0, 0, 0, 0],
      foreground: [0, 0, 0, 1],
      accent: [0, 0, 0, 0.6],
    },
```

Two deliberate choices worth preserving if you touch these numbers:

- **`classic-ivory` and `monochrome` foregrounds are K-only** (`[0,0,0,0.78]`,
  `[0,0,0,1]`) even though their hex values are very slightly warm/near-black. Body text
  built from four inks misregisters on press and prints visibly fuzzy at invitation sizes.
  Neutral dark text must be K-only. The Global Constraints section states this as a rule.
- **`midnight-navy`'s background is a rich dark** (four-ink) because it is a large flood
  fill, where four-ink coverage is correct and desirable — the opposite of small text.

- [ ] **Step 3: Swap the typography preview stacks to the new families**

Replace each pairing's `preview` block:

```typescript
// classic-serif
    preview: {
      heading: "'Crimson Text', Georgia, serif",
      body: "'Crimson Text', Georgia, serif",
    },
// modern-sans
    preview: {
      heading: "Lato, 'Helvetica Neue', Arial, sans-serif",
      body: "Lato, 'Helvetica Neue', Arial, sans-serif",
    },
// elegant-script
    preview: {
      heading: "'Great Vibes', 'Brush Script MT', cursive",
      body: "'Crimson Text', Georgia, serif",
    },
// editorial-mix
    preview: {
      heading: "Spectral, Georgia, serif",
      body: "Lato, 'Helvetica Neue', Arial, sans-serif",
    },
```

The first family in each stack must be the same one `FONT_SETS` embeds for that slug
(Task 4). This is the point of the step: the on-screen preview and the printed card should
not be set in different typefaces. The old system fonts stay behind them as fallbacks so
nothing breaks before webfonts load.

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0. `lib/config/design-vocabulary.test.ts` already asserts on the
vocabulary — if it asserts an exact `preview` string, update that expectation to the new
family and note it in your report; do not weaken the assertion to make it pass.

- [ ] **Step 5: Commit**

```bash
git add lib/config/design-vocabulary.ts
git commit -m "feat(pdf): author CMYK per colour theme and swap to embeddable fonts"
```

---

### Task 6: `services/pdf/types.ts` and `page-specs.ts`

**Files:**
- Create: `services/pdf/types.ts`
- Create: `services/pdf/page-specs.ts`
- Test: `services/pdf/page-specs.test.ts`

**Interfaces:**
- Produces: `Cmyk`, `Box`, `DrawInstruction`, `PageSpec`, `PAGE_SPECS`, `pageSpecFor` —
  consumed by every later `services/pdf` module.

- [ ] **Step 1: Write `types.ts`**

```typescript
/** Shared print types. Pure — no pdf-lib import, so layout stays testable. */

/** Components 0–1, matching pdf-lib's cmyk(). */
export type Cmyk = [number, number, number, number];

/** Points, origin bottom-left (PDF convention). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PdfSizeSlug = "FIVE_BY_SEVEN" | "A5" | "A6";

/**
 * Layout returns instructions rather than drawing, so a layout can be asserted
 * on in a unit test without producing a PDF. render.ts is the only module that
 * turns these into pdf-lib calls.
 */
export type DrawInstruction =
  | { kind: "rect"; box: Box; color: Cmyk }
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      size: number;
      color: Cmyk;
      font: "headingRegular" | "headingBold" | "bodyRegular" | "bodyBold" | "bodyItalic";
      align: "left" | "center";
      /** Present for centred text: the width it is centred within. */
      maxWidth?: number;
    }
  | { kind: "image"; assetId: string; box: Box }
  | { kind: "line"; from: { x: number; y: number }; to: { x: number; y: number }; color: Cmyk; thickness: number };
```

- [ ] **Step 2: Write the failing test**

Create `services/pdf/page-specs.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { PAGE_SPECS, pageSpecFor, MM_TO_PT } from "./page-specs";

describe("page specs", () => {
  it("sizes 5x7 inches in points", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    expect(spec.trimWidth).toBeCloseTo(360, 1);
    expect(spec.trimHeight).toBeCloseTo(504, 1);
  });

  it("sizes A5 and A6 in points", () => {
    expect(pageSpecFor("A5").trimWidth).toBeCloseTo(419.53, 1);
    expect(pageSpecFor("A5").trimHeight).toBeCloseTo(595.28, 1);
    expect(pageSpecFor("A6").trimWidth).toBeCloseTo(297.64, 1);
    expect(pageSpecFor("A6").trimHeight).toBeCloseTo(419.53, 1);
  });

  it("uses a 3mm bleed on every size", () => {
    for (const spec of Object.values(PAGE_SPECS)) {
      expect(spec.bleed).toBeCloseTo(3 * MM_TO_PT, 2);
    }
  });

  it("makes the media box the trim plus bleed on all four edges", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    expect(spec.mediaWidth).toBeCloseTo(spec.trimWidth + spec.bleed * 2, 2);
    expect(spec.mediaHeight).toBeCloseTo(spec.trimHeight + spec.bleed * 2, 2);
  });

  it("insets the safe area 5mm inside the trim", () => {
    const spec = pageSpecFor("A5");
    const safe = spec.safeBox;
    expect(safe.x).toBeCloseTo(spec.bleed + 5 * MM_TO_PT, 2);
    expect(safe.width).toBeCloseTo(spec.trimWidth - 10 * MM_TO_PT, 2);
  });

  it("puts the trim box inside the media box by exactly the bleed", () => {
    const spec = pageSpecFor("A6");
    expect(spec.trimBox.x).toBeCloseTo(spec.bleed, 2);
    expect(spec.trimBox.width).toBeCloseTo(spec.trimWidth, 2);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
pnpm test:watch --run services/pdf/page-specs.test.ts
```

Expected: FAIL — `Cannot find module './page-specs'`.

- [ ] **Step 4: Write `page-specs.ts`**

```typescript
import type { Box, PdfSizeSlug } from "./types";

/**
 * Page geometry — Ph6.md §2, §3. Sizes are data; the layout that uses them is
 * code. Adding a paper size is an entry in this table and nothing else, which
 * is the extensibility the spec actually asks for.
 *
 * All values in PDF points (72 per inch), origin bottom-left.
 */

export const PT_PER_INCH = 72;
export const MM_TO_PT = PT_PER_INCH / 25.4;

/** Commercial standard: 3mm bleed, 5mm safe inset from trim. */
const BLEED_MM = 3;
const SAFE_INSET_MM = 5;

export interface PageSpec {
  slug: PdfSizeSlug;
  label: string;
  trimWidth: number;
  trimHeight: number;
  bleed: number;
  /** Full page including bleed — what the PDF page is actually sized to. */
  mediaWidth: number;
  mediaHeight: number;
  /** Where the finished card sits within the media box. */
  trimBox: Box;
  /** Nothing meaningful may be placed outside this. */
  safeBox: Box;
}

function build(
  slug: PdfSizeSlug,
  label: string,
  trimWidth: number,
  trimHeight: number,
): PageSpec {
  const bleed = BLEED_MM * MM_TO_PT;
  const safeInset = SAFE_INSET_MM * MM_TO_PT;

  return {
    slug,
    label,
    trimWidth,
    trimHeight,
    bleed,
    mediaWidth: trimWidth + bleed * 2,
    mediaHeight: trimHeight + bleed * 2,
    trimBox: { x: bleed, y: bleed, width: trimWidth, height: trimHeight },
    safeBox: {
      x: bleed + safeInset,
      y: bleed + safeInset,
      width: trimWidth - safeInset * 2,
      height: trimHeight - safeInset * 2,
    },
  };
}

export const PAGE_SPECS: Record<PdfSizeSlug, PageSpec> = {
  FIVE_BY_SEVEN: build("FIVE_BY_SEVEN", '5 × 7"', 5 * PT_PER_INCH, 7 * PT_PER_INCH),
  A5: build("A5", "A5", 148 * MM_TO_PT, 210 * MM_TO_PT),
  A6: build("A6", "A6", 105 * MM_TO_PT, 148 * MM_TO_PT),
};

export function pageSpecFor(slug: PdfSizeSlug): PageSpec {
  return PAGE_SPECS[slug];
}
```

- [ ] **Step 5: Run the test again**

```bash
pnpm test:watch --run services/pdf/page-specs.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add services/pdf/types.ts services/pdf/page-specs.ts services/pdf/page-specs.test.ts
git commit -m "feat(pdf): add page geometry for 5x7, A5 and A6 with bleed and safe area"
```

---

### Task 7: `services/pdf/colour.ts`

**Files:** Create `services/pdf/colour.ts`, `services/pdf/colour.test.ts`

**Interfaces:**
- Consumes: `COLOR_THEMES`, `DESIGN_DEFAULTS` (`@/lib/config/design-vocabulary`), `Cmyk`.
- Produces: `printColours(themeSlug)`, `PrintColours` — consumed by Tasks 10, 11, 12.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { printColours } from "./colour";

describe("printColours", () => {
  it("returns the authored CMYK for a known theme", () => {
    const c = printColours("classic-ivory");
    expect(c.background).toEqual([0, 0.02, 0.05, 0.04]);
    expect(c.accent).toEqual([0, 0.19, 0.81, 0.21]);
  });

  it("keeps neutral dark text K-only, so small type does not misregister", () => {
    expect(printColours("classic-ivory").foreground).toEqual([0, 0, 0, 0.78]);
    expect(printColours("monochrome").foreground).toEqual([0, 0, 0, 1]);
  });

  it("falls back to the default theme rather than throwing on a retired slug", () => {
    const c = printColours("no-such-theme");
    expect(c.background).toHaveLength(4);
    expect(c.foreground).toHaveLength(4);
  });

  it("keeps every component within 0-1", () => {
    for (const slug of ["classic-ivory", "blush-rose", "sage-garden", "midnight-navy", "burgundy-velvet", "coral-fiesta", "monochrome"]) {
      const c = printColours(slug);
      for (const tuple of [c.background, c.foreground, c.accent]) {
        for (const v of tuple) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** (`Cannot find module './colour'`)

```bash
pnpm test:watch --run services/pdf/colour.test.ts
```

- [ ] **Step 3: Write `colour.ts`**

```typescript
import { COLOR_THEMES, DESIGN_DEFAULTS } from "@/lib/config/design-vocabulary";
import type { Cmyk } from "./types";

/**
 * Theme slug → press colours — Ph6.md §4.
 *
 * No hex→CMYK conversion happens anywhere in this codebase. The values are
 * authored in design-vocabulary.ts because the palette is a fixed, curated
 * vocabulary, and an uncalibrated conversion is a guess that only reveals
 * itself after the job is printed.
 */

export interface PrintColours {
  background: Cmyk;
  foreground: Cmyk;
  accent: Cmyk;
}

export function printColours(themeSlug: string): PrintColours {
  const theme =
    COLOR_THEMES.find((t) => t.slug === themeSlug) ??
    COLOR_THEMES.find((t) => t.slug === DESIGN_DEFAULTS.colorTheme) ??
    COLOR_THEMES[0]!;

  return {
    background: theme.cmyk.background,
    foreground: theme.cmyk.foreground,
    accent: theme.cmyk.accent,
  };
}
```

- [ ] **Step 4: Run it, confirm PASS (4 tests). Commit**

```bash
git add services/pdf/colour.ts services/pdf/colour.test.ts
git commit -m "feat(pdf): resolve theme slugs to authored CMYK"
```

---

### Task 8: `services/pdf/text.ts` — measurement, wrapping, overflow

**Files:** Create `services/pdf/text.ts`, `services/pdf/text.test.ts`

Deliverable 9 requires detecting text overflow *before* generation. Programmatic layout
makes this exact: we measure with the real embedded font's metrics.

**Interfaces:**
- Produces: `MeasureFn`, `wrapText(text, maxWidth, size, measure)`, `fitsInBox(...)` —
  consumed by Tasks 10, 11, 13.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { wrapText, fitsInBox } from "./text";

/** Deterministic stand-in for a font: every glyph is 10 units wide at size 1. */
const measure = (text: string, size: number) => text.length * size * 10;

describe("wrapText", () => {
  it("keeps a short line intact", () => {
    expect(wrapText("Ana and Ben", 2000, 1, measure)).toEqual(["Ana and Ben"]);
  });

  it("breaks on word boundaries, never mid-word", () => {
    const lines = wrapText("Ana and Ben", 60, 1, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line).not.toMatch(/^\s|\s$/);
    expect(lines.join(" ")).toBe("Ana and Ben");
  });

  it("puts a word longer than the line on its own line rather than looping forever", () => {
    const lines = wrapText("supercalifragilistic", 50, 1, measure);
    expect(lines).toEqual(["supercalifragilistic"]);
  });

  it("preserves explicit newlines as hard breaks", () => {
    expect(wrapText("one\ntwo", 2000, 1, measure)).toEqual(["one", "two"]);
  });

  it("returns an empty array for empty input", () => {
    expect(wrapText("   ", 100, 1, measure)).toEqual([]);
  });
});

describe("fitsInBox", () => {
  it("passes when the wrapped text is shorter than the box", () => {
    const r = fitsInBox("Ana and Ben", { width: 2000, height: 100 }, 1, 1.4, measure);
    expect(r.fits).toBe(true);
    expect(r.lines).toEqual(["Ana and Ben"]);
  });

  it("fails when wrapped lines exceed the box height", () => {
    const r = fitsInBox("Ana and Ben and everyone else", { width: 40, height: 2 }, 1, 1.4, measure);
    expect(r.fits).toBe(false);
    expect(r.requiredHeight).toBeGreaterThan(2);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

- [ ] **Step 3: Write `text.ts`**

```typescript
/**
 * Text measurement and wrapping — Ph6.md §5, §9.
 *
 * Pure, with measurement injected: the caller passes a function backed by the
 * real embedded font (pdf-lib's widthOfTextAtSize), and tests pass a
 * deterministic stub. That is what makes overflow detection exact rather than
 * estimated — and overflow on a printed card is not recoverable after the run.
 */

/** Width of `text` at `size`, in points. */
export type MeasureFn = (text: string, size: number) => number;

export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  measure: MeasureFn,
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate, size) <= maxWidth || !current) {
        // `!current` keeps a single over-long word on its own line instead of
        // looping forever trying to fit it.
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export interface FitResult {
  fits: boolean;
  lines: string[];
  requiredHeight: number;
}

export function fitsInBox(
  text: string,
  box: { width: number; height: number },
  size: number,
  lineHeightRatio: number,
  measure: MeasureFn,
): FitResult {
  const lines = wrapText(text, box.width, size, measure);
  const requiredHeight = lines.length * size * lineHeightRatio;
  return { fits: requiredHeight <= box.height, lines, requiredHeight };
}
```

- [ ] **Step 4: Run it, confirm PASS (7 tests). Commit**

```bash
git add services/pdf/text.ts services/pdf/text.test.ts
git commit -m "feat(pdf): measure, wrap and overflow-check text with real font metrics"
```

---

### Task 9: `services/pdf/images.ts` — DPI validation and CMYK conversion

**Files:** Create `services/pdf/images.ts`

No test file: this reaches Supabase Storage and runs `sharp`, matching this codebase's
convention for I/O modules (`services/media/storage.ts` has none either). The pure part —
the DPI arithmetic — is exercised through `validate.ts`'s tests in Task 13.

**Read `services/pdf/spike-cmyk.md` (Task 1) before writing this file.** If the spike found
`embedJpg` rejects CMYK JPEGs, follow the fallback it recorded and note the deviation.

**Interfaces:**
- Consumes: `getAsset` / `assetObjectPath` (`@/services/media`), `signedUrl`, `BUCKETS`.
- Produces: `requiredPixelsFor(box, dpi)`, `PreparedImage`, `prepareImage(...)` —
  `prepareImage` consumed by Task 12; `requiredPixelsFor` is the resize target inside this
  module and is exported so Task 18's manual check can reproduce the arithmetic.

- [ ] **Step 1: Write `images.ts`**

```typescript
import "server-only";

import sharp from "sharp";
import { assetObjectPath } from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";
import type { AssetRow } from "@/services/media";
import type { Box } from "./types";

/**
 * Print image pipeline — Ph6.md §4, §6.
 *
 * Always reads the ORIGINAL asset, never a thumbnail or the 1280px preview
 * variant: a preview is far below 300 DPI at card size, and silently printing
 * one is exactly the failure this phase exists to prevent.
 */

export const PRINT_DPI = 300;

/** Pixels needed to fill `box` (points) at `dpi`. */
export function requiredPixelsFor(box: Box, dpi = PRINT_DPI) {
  return {
    width: Math.ceil((box.width / 72) * dpi),
    height: Math.ceil((box.height / 72) * dpi),
  };
}

export interface PreparedImage {
  bytes: Uint8Array;
  /** "jpeg" unless the Task 1 spike forced a different container. */
  format: "jpeg" | "png";
}

/**
 * Fetch the original, cover-crop to the box's aspect ratio, resize to the
 * exact pixel size 300 DPI needs, and convert to CMYK.
 *
 * Aspect ratio is always preserved (Ph6.md §6) — `fit: "cover"` crops the
 * overflow rather than distorting the photograph.
 */
export async function prepareImage(
  asset: AssetRow,
  box: Box,
): Promise<PreparedImage | null> {
  const path = assetObjectPath(
    asset.profileId,
    asset.id,
    asset.version,
    "original",
    extensionOf(asset.originalFilename),
  );

  const url = await signedUrl(asset.bucket as "media" | "avatars", path, 60);
  if (!url) return null;

  const upstream = await fetch(url);
  if (!upstream.ok) return null;
  const input = Buffer.from(await upstream.arrayBuffer());

  const target = requiredPixelsFor(box);
  const bytes = await sharp(input)
    .resize({ width: target.width, height: target.height, fit: "cover" })
    .toColourspace("cmyk")
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return { bytes: new Uint8Array(bytes), format: "jpeg" };
}
```

`chromaSubsampling: "4:4:4"` is deliberate — the default `4:2:0` discards colour detail
that is invisible on screen and visible in print.

- [ ] **Step 2: Type-check and commit**

```bash
pnpm typecheck
```

```bash
git add services/pdf/images.ts
git commit -m "feat(pdf): prepare originals at 300 DPI in CMYK"
```

---

### Task 10: `services/pdf/layout/front.ts`

**Files:** Create `services/pdf/layout/front.ts`, `services/pdf/layout/front.test.ts`

Design doc Decision 3 — the front carries hosts, title/subtitle, date, time, venue, and
the invitation message. Layout returns `DrawInstruction[]`; it never touches pdf-lib, which
is what makes it unit-testable.

**Interfaces:**
- Consumes: `PageSpec`, `DrawInstruction`, `PrintColours`, `MeasureFn`, `fitsInBox`,
  `PreviewModel` (`@/lib/invitation/preview-model`).
- Produces: `FrontInput`, `OverflowIssue`, `LayoutResult`, `layoutFront(input)` — consumed
  by Tasks 11 and 15.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { layoutFront } from "./front";
import { pageSpecFor } from "../page-specs";
import { printColours } from "../colour";

const measure = (text: string, size: number) => text.length * size * 0.5;

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    colours: printColours("classic-ivory"),
    measure,
    title: "Ana & Ben",
    subtitle: null,
    dateLine: "Saturday, 14 March 2027",
    timeLine: "3:00 PM",
    hostNames: ["Ana Santos", "Ben Cruz"],
    invitationMessage: "Together with our families, we invite you.",
    venueLines: ["Basilica del Santo Niño", "Cebu City"],
    coverAssetId: null as string | null,
    hidden: new Set<string>(),
    ...over,
  };
}

describe("layoutFront", () => {
  it("fills the whole media box with the background, edge to edge", () => {
    const { instructions } = layoutFront(input());
    const bg = instructions.find((i) => i.kind === "rect");
    expect(bg).toBeDefined();
    if (bg?.kind !== "rect") throw new Error("expected a rect");
    expect(bg.box.x).toBe(0);
    expect(bg.box.y).toBe(0);
    expect(bg.box.width).toBeCloseTo(pageSpecFor("FIVE_BY_SEVEN").mediaWidth, 2);
  });

  it("draws the title", () => {
    const { instructions } = layoutFront(input());
    const texts = instructions.filter((i) => i.kind === "text");
    expect(texts.some((t) => t.kind === "text" && t.text.includes("Ana & Ben"))).toBe(true);
  });

  it("keeps every text instruction inside the safe area", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    const { instructions } = layoutFront(input());
    for (const i of instructions) {
      if (i.kind !== "text") continue;
      expect(i.x).toBeGreaterThanOrEqual(spec.safeBox.x - 0.01);
      expect(i.y).toBeGreaterThanOrEqual(spec.safeBox.y - 0.01);
    }
  });

  it("omits hosts when the customer hid that section", () => {
    const { instructions } = layoutFront(input({ hidden: new Set(["hosts"]) }));
    expect(instructions.some((i) => i.kind === "text" && i.text.includes("Ana Santos"))).toBe(false);
  });

  it("emits a full-bleed image instruction when a cover asset is present", () => {
    const { instructions } = layoutFront(input({ coverAssetId: "asset-1" }));
    const image = instructions.find((i) => i.kind === "image");
    expect(image).toBeDefined();
    if (image?.kind !== "image") throw new Error("expected an image");
    expect(image.assetId).toBe("asset-1");
  });

  it("reports overflow rather than silently clipping", () => {
    const result = layoutFront(input({ invitationMessage: "word ".repeat(4000).trim() }));
    expect(result.overflows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

- [ ] **Step 3: Write `front.ts`**

```typescript
import type { DrawInstruction, PageSpec } from "../types";
import type { PrintColours } from "../colour";
import { fitsInBox, type MeasureFn } from "../text";

/**
 * Front face — design doc Decision 3.
 *
 * Returns instructions instead of drawing, so a layout can be asserted on in a
 * unit test without producing a PDF. Section visibility uses the same hidden
 * set the builder preview and the website use, so a section switched off stays
 * off in print.
 */

export interface FrontInput {
  spec: PageSpec;
  colours: PrintColours;
  measure: MeasureFn;
  title: string;
  subtitle: string | null;
  dateLine: string | null;
  timeLine: string | null;
  hostNames: string[];
  invitationMessage: string | null;
  venueLines: string[];
  coverAssetId: string | null;
  hidden: Set<string>;
}

export interface OverflowIssue {
  field: string;
  requiredHeight: number;
  availableHeight: number;
}

export interface LayoutResult {
  instructions: DrawInstruction[];
  overflows: OverflowIssue[];
}

const LINE_HEIGHT = 1.35;

export function layoutFront(input: FrontInput): LayoutResult {
  const { spec, colours, measure, hidden } = input;
  const instructions: DrawInstruction[] = [];
  const overflows: OverflowIssue[] = [];
  const safe = spec.safeBox;

  // Background covers the full media box so the colour runs past the trim —
  // anything less leaves a white sliver when the guillotine drifts.
  instructions.push({
    kind: "rect",
    box: { x: 0, y: 0, width: spec.mediaWidth, height: spec.mediaHeight },
    color: colours.background,
  });

  // Cover photo occupies the top 40% of the card, full bleed on three edges.
  let cursorY = safe.y + safe.height;
  if (input.coverAssetId) {
    const imageHeight = spec.mediaHeight * 0.4;
    instructions.push({
      kind: "image",
      assetId: input.coverAssetId,
      box: {
        x: 0,
        y: spec.mediaHeight - imageHeight,
        width: spec.mediaWidth,
        height: imageHeight,
      },
    });
    cursorY = spec.mediaHeight - imageHeight - 24;
  }

  const centre = safe.x + safe.width / 2;

  function centred(
    text: string,
    size: number,
    font: "headingRegular" | "headingBold" | "bodyRegular" | "bodyItalic",
    color: typeof colours.background,
    field: string,
  ) {
    const available = cursorY - safe.y;
    const fit = fitsInBox(text, { width: safe.width, height: available }, size, LINE_HEIGHT, measure);
    if (!fit.fits) {
      overflows.push({ field, requiredHeight: fit.requiredHeight, availableHeight: available });
    }
    for (const line of fit.lines) {
      cursorY -= size * LINE_HEIGHT;
      instructions.push({
        kind: "text",
        text: line,
        x: centre,
        y: Math.max(cursorY, safe.y),
        size,
        color,
        font,
        align: "center",
        maxWidth: safe.width,
      });
    }
    cursorY -= size * 0.6;
  }

  if (input.hostNames.length > 0 && !hidden.has("hosts")) {
    centred(input.hostNames.join("  ·  "), 13, "bodyRegular", colours.foreground, "hosts");
  }

  centred(input.title, 30, "headingRegular", colours.foreground, "title");
  if (input.subtitle) centred(input.subtitle, 13, "bodyItalic", colours.foreground, "subtitle");

  const when = [input.dateLine, input.timeLine].filter(Boolean).join("  ·  ");
  if (when) centred(when, 12, "bodyBold", colours.accent, "date");

  if (input.invitationMessage) {
    centred(input.invitationMessage, 11, "bodyRegular", colours.foreground, "invitationMessage");
  }

  if (input.venueLines.length > 0 && !hidden.has("venues")) {
    for (const line of input.venueLines) {
      centred(line, 11, "bodyRegular", colours.foreground, "venues");
    }
  }

  return { instructions, overflows };
}
```

- [ ] **Step 4: Run it, confirm PASS (6 tests). Commit**

```bash
git add services/pdf/layout/front.ts services/pdf/layout/front.test.ts
git commit -m "feat(pdf): lay out the invitation front face"
```

---

### Task 11: `services/pdf/layout/back.ts`

**Files:** Create `services/pdf/layout/back.ts`, `services/pdf/layout/back.test.ts`

Back carries parents, principal sponsors, programme, dress code, gifts, notes, RSVP.
Design doc: **when everything on the back is hidden or empty, the caller emits a single
page** — a blank back costs money at the press and reads as a mistake. This module signals
that with `isEmpty`.

**Interfaces:**
- Produces: `layoutBack(input): BackLayoutResult` (`LayoutResult` plus `isEmpty`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { layoutBack } from "./back";
import { pageSpecFor } from "../page-specs";
import { printColours } from "../colour";

const measure = (text: string, size: number) => text.length * size * 0.5;

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    colours: printColours("classic-ivory"),
    measure,
    parents: ["Rosa Santos", "Mario Santos"],
    sponsors: ["Luis Reyes", "Elena Cruz"],
    programme: [{ time: "3:00 PM", title: "Ceremony" }],
    dressCode: "Formal",
    giftsPreference: null as string | null,
    specialNotes: null as string | null,
    rsvpLine: "Kindly reply by 14 February 2027",
    hidden: new Set<string>(),
    ...over,
  };
}

describe("layoutBack", () => {
  it("reports empty when every section is hidden", () => {
    const result = layoutBack(
      input({ hidden: new Set(["parents", "sponsors", "program", "dress-code", "gifts", "notes", "rsvp"]) }),
    );
    expect(result.isEmpty).toBe(true);
  });

  it("reports empty when there is simply no content", () => {
    const result = layoutBack(
      input({ parents: [], sponsors: [], programme: [], dressCode: null, rsvpLine: null }),
    );
    expect(result.isEmpty).toBe(true);
  });

  it("is not empty when at least one section has content", () => {
    expect(layoutBack(input()).isEmpty).toBe(false);
  });

  it("draws the background even when content exists", () => {
    const { instructions } = layoutBack(input());
    expect(instructions.some((i) => i.kind === "rect")).toBe(true);
  });

  it("omits sponsors when that section is hidden", () => {
    const { instructions } = layoutBack(input({ hidden: new Set(["sponsors"]) }));
    expect(instructions.some((i) => i.kind === "text" && i.text.includes("Luis Reyes"))).toBe(false);
  });

  it("keeps text inside the safe area", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    const { instructions } = layoutBack(input());
    for (const i of instructions) {
      if (i.kind !== "text") continue;
      expect(i.y).toBeGreaterThanOrEqual(spec.safeBox.y - 0.01);
    }
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

- [ ] **Step 3: Write `back.ts`**

```typescript
import type { DrawInstruction, PageSpec } from "../types";
import type { PrintColours } from "../colour";
import { fitsInBox, type MeasureFn } from "../text";
import type { LayoutResult, OverflowIssue } from "./front";

/**
 * Back face — design doc Decision 3. Carries what a Filipino invitation
 * traditionally names (parents, principal sponsors) plus the practical
 * details, which together will not fit on one face at a readable size.
 */

export interface BackInput {
  spec: PageSpec;
  colours: PrintColours;
  measure: MeasureFn;
  parents: string[];
  sponsors: string[];
  programme: { time: string | null; title: string }[];
  dressCode: string | null;
  giftsPreference: string | null;
  specialNotes: string | null;
  rsvpLine: string | null;
  hidden: Set<string>;
}

export interface BackLayoutResult extends LayoutResult {
  /** True when nothing would be printed — the caller emits one page, not a blank back. */
  isEmpty: boolean;
}

const LINE_HEIGHT = 1.35;

export function layoutBack(input: BackInput): BackLayoutResult {
  const { spec, colours, measure, hidden } = input;
  const instructions: DrawInstruction[] = [];
  const overflows: OverflowIssue[] = [];
  const safe = spec.safeBox;

  instructions.push({
    kind: "rect",
    box: { x: 0, y: 0, width: spec.mediaWidth, height: spec.mediaHeight },
    color: colours.background,
  });

  let cursorY = safe.y + safe.height;
  const centre = safe.x + safe.width / 2;
  let drewSomething = false;

  function block(
    heading: string | null,
    lines: string[],
    size: number,
    field: string,
  ) {
    if (lines.length === 0) return;
    drewSomething = true;

    if (heading) {
      cursorY -= 11 * LINE_HEIGHT;
      instructions.push({
        kind: "text",
        text: heading.toUpperCase(),
        x: centre,
        y: Math.max(cursorY, safe.y),
        size: 8,
        color: colours.accent,
        font: "bodyBold",
        align: "center",
        maxWidth: safe.width,
      });
    }

    for (const line of lines) {
      const available = cursorY - safe.y;
      const fit = fitsInBox(line, { width: safe.width, height: available }, size, LINE_HEIGHT, measure);
      if (!fit.fits) {
        overflows.push({ field, requiredHeight: fit.requiredHeight, availableHeight: available });
      }
      for (const wrapped of fit.lines) {
        cursorY -= size * LINE_HEIGHT;
        instructions.push({
          kind: "text",
          text: wrapped,
          x: centre,
          y: Math.max(cursorY, safe.y),
          size,
          color: colours.foreground,
          font: "bodyRegular",
          align: "center",
          maxWidth: safe.width,
        });
      }
    }
    cursorY -= 8;
  }

  if (!hidden.has("parents")) block("Parents", input.parents, 10, "parents");
  if (!hidden.has("sponsors")) block("Principal Sponsors", input.sponsors, 10, "sponsors");

  if (!hidden.has("program")) {
    block(
      "Programme",
      input.programme.map((item) => (item.time ? `${item.time} — ${item.title}` : item.title)),
      10,
      "program",
    );
  }

  if (!hidden.has("dress-code") && input.dressCode) block("Dress Code", [input.dressCode], 10, "dress-code");
  if (!hidden.has("gifts") && input.giftsPreference) block("Gifts", [input.giftsPreference], 10, "gifts");
  if (!hidden.has("notes") && input.specialNotes) block("Notes", [input.specialNotes], 10, "notes");
  if (!hidden.has("rsvp") && input.rsvpLine) block(null, [input.rsvpLine], 10, "rsvp");

  return { instructions, overflows, isEmpty: !drewSomething };
}
```

- [ ] **Step 4: Run it, confirm PASS (6 tests). Commit**

```bash
git add services/pdf/layout/back.ts services/pdf/layout/back.test.ts
git commit -m "feat(pdf): lay out the invitation back face"
```

---

### Task 12: `services/pdf/render.ts` — pdf-lib assembly

**Files:** Create `services/pdf/render.ts`

The only module that imports pdf-lib. Turns instructions into a document, embeds fonts and
images, draws crop marks, sets metadata. No test file — byte output is verified manually
(Task 18); everything it consumes is already tested.

**Why this file exposes two functions, not one.** Layout needs a `MeasureFn` (Task 8), and
a real `MeasureFn` needs an *embedded* font — pdf-lib's metrics live on `PDFFont`, which
only exists once a document has embedded it. So the caller opens a document first
(`createPrintDocument`), lays out against that document's true metrics, validates the
overflows layout reported, and only then renders. Measuring against a guessed width and
rendering against the real one is how text that passed validation ends up clipped on the
press.

**Interfaces:**
- Consumes: everything from Tasks 4–11.
- Produces: `GENERATOR_VERSION`, `PrintDocument`, `createPrintDocument(typographySlug)`,
  `renderPdf(printDoc, input)` — consumed by Task 15.

- [ ] **Step 1: Write `render.ts`**

```typescript
import "server-only";

import { PDFDocument, cmyk, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { AssetRow } from "@/services/media";
import type { Cmyk, DrawInstruction, PageSpec } from "./types";
import type { MeasureFn } from "./text";
import { fontFilesFor, loadFontBytes } from "./fonts";
import { prepareImage } from "./images";

/**
 * Document assembly — Ph6.md §1, §3, §11.
 *
 * Bump GENERATOR_VERSION by hand whenever a change here or in layout/* would
 * alter output for unchanged input. That is what makes "reproducible from the
 * same inputs" a claim you can actually check: same invitation + same
 * generator version should produce the same document.
 */
export const GENERATOR_VERSION = "6.0.0";

export type FontKey =
  | "headingRegular"
  | "headingBold"
  | "bodyRegular"
  | "bodyBold"
  | "bodyItalic";

export interface PrintDocument {
  doc: PDFDocument;
  fonts: Record<FontKey, PDFFont>;
  /** Measures against bodyRegular — the face most body copy is set in. */
  measure: MeasureFn;
}

export interface RenderInput {
  spec: PageSpec;
  pages: DrawInstruction[][];
  cropMarks: boolean;
  assetsById: Map<string, AssetRow>;
  metadata: {
    invitationId: string;
    profileId: string;
    templateVersion: string | null;
  };
}

const toColor = (c: Cmyk) => cmyk(c[0], c[1], c[2], c[3]);

/**
 * Opens a document with this invitation's typefaces embedded, and hands back a
 * MeasureFn backed by their real metrics.
 *
 * Throws on an unmapped slug. Validation (Task 13) reports that as a blocking
 * issue first, so reaching this throw means a caller skipped validation — which
 * should fail loudly, not silently substitute a typeface on a printed card.
 */
export async function createPrintDocument(
  typographySlug: string,
): Promise<PrintDocument> {
  const files = fontFilesFor(typographySlug);
  if (!files) {
    throw new Error(`No print fonts mapped for typography "${typographySlug}"`);
  }

  const doc = await PDFDocument.create();
  // pdf-lib embeds only its 14 standard fonts without this. Every face this
  // phase uses is a custom TTF, so registration is mandatory, not optional.
  doc.registerFontkit(fontkit);

  const fonts = {} as Record<FontKey, PDFFont>;
  for (const key of Object.keys(files) as FontKey[]) {
    fonts[key] = await doc.embedFont(await loadFontBytes(files[key]), {
      subset: true,
    });
  }

  const measure: MeasureFn = (text, size) =>
    fonts.bodyRegular.widthOfTextAtSize(text, size);

  return { doc, fonts, measure };
}

/** Crop marks sit in the bleed, offset from the trim corner, never crossing it. */
function drawCropMarks(page: ReturnType<PDFDocument["addPage"]>, spec: PageSpec) {
  const b = spec.bleed;
  const len = b * 0.8;
  const black = cmyk(0, 0, 0, 1);
  const marks: [number, number, number, number][] = [
    [0, b, len, b], [b, 0, b, len],
    [spec.mediaWidth - len, b, spec.mediaWidth, b], [spec.mediaWidth - b, 0, spec.mediaWidth - b, len],
    [0, spec.mediaHeight - b, len, spec.mediaHeight - b], [b, spec.mediaHeight - len, b, spec.mediaHeight],
    [spec.mediaWidth - len, spec.mediaHeight - b, spec.mediaWidth, spec.mediaHeight - b],
    [spec.mediaWidth - b, spec.mediaHeight - len, spec.mediaWidth - b, spec.mediaHeight],
  ];

  for (const [x1, y1, x2, y2] of marks) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: black, thickness: 0.25 });
  }
}

export async function renderPdf(
  printDoc: PrintDocument,
  input: RenderInput,
): Promise<Uint8Array> {
  const { doc, fonts } = printDoc;

  doc.setTitle(`Invitation ${input.metadata.invitationId}`);
  doc.setProducer(`ML-DEP PDF Engine ${GENERATOR_VERSION}`);
  doc.setCreator("ML Printing — ML Digital Event Platform");
  doc.setCreationDate(new Date());
  doc.setSubject(
    [
      `invitation=${input.metadata.invitationId}`,
      `customer=${input.metadata.profileId}`,
      `template=${input.metadata.templateVersion ?? "none"}`,
      `generator=${GENERATOR_VERSION}`,
    ].join("; "),
  );

  for (const instructions of input.pages) {
    const page = doc.addPage([input.spec.mediaWidth, input.spec.mediaHeight]);

    for (const item of instructions) {
      if (item.kind === "rect") {
        page.drawRectangle({ ...item.box, color: toColor(item.color) });
      } else if (item.kind === "line") {
        page.drawLine({ start: item.from, end: item.to, color: toColor(item.color), thickness: item.thickness });
      } else if (item.kind === "text") {
        const font = fonts[item.font];
        const width = font.widthOfTextAtSize(item.text, item.size);
        const x = item.align === "center" ? item.x - width / 2 : item.x;
        page.drawText(item.text, { x, y: item.y, size: item.size, font, color: toColor(item.color) });
      } else if (item.kind === "image") {
        const asset = input.assetsById.get(item.assetId);
        if (!asset) continue;
        const prepared = await prepareImage(asset, item.box);
        if (!prepared) continue;
        const embedded =
          prepared.format === "jpeg"
            ? await doc.embedJpg(prepared.bytes)
            : await doc.embedPng(prepared.bytes);
        page.drawImage(embedded, item.box);
      }
    }

    if (input.cropMarks) drawCropMarks(page, input.spec);
  }

  return doc.save();
}
```

- [ ] **Step 2: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add services/pdf/render.ts
git commit -m "feat(pdf): assemble the document with embedded fonts, CMYK and crop marks"
```

---

### Task 13: `services/pdf/validate.ts`

**Files:** Create `services/pdf/validate.ts`, `services/pdf/validate.test.ts`

Deliverable 9. Blocking issues stop generation; warnings do not.

**Interfaces:**
- Produces: `IssueCode`, `ValidationIssue`, `ValidationReport`, `ValidateInput`,
  `buildReport(input)` — consumed by Tasks 15, 17.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { buildReport } from "./validate";
import { pageSpecFor } from "./page-specs";

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    typographySlug: "classic-serif",
    completionIssues: [] as { step: string; message: string }[],
    overflows: [] as { field: string; requiredHeight: number; availableHeight: number }[],
    images: [] as { assetId: string; width: number | null; height: number | null; boxWidthPt: number; boxHeightPt: number }[],
    hasCover: true,
    backIsEmpty: false,
    ...over,
  };
}

describe("buildReport", () => {
  it("passes a complete invitation", () => {
    const report = buildReport(input());
    expect(report.blocking).toHaveLength(0);
    expect(report.canGenerate).toBe(true);
  });

  it("blocks on missing required fields", () => {
    const report = buildReport(input({ completionIssues: [{ step: "event", message: "Add a date." }] }));
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "missing-field")).toBe(true);
  });

  it("blocks on text overflow", () => {
    const report = buildReport(input({ overflows: [{ field: "invitationMessage", requiredHeight: 400, availableHeight: 100 }] }));
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "text-overflow")).toBe(true);
  });

  it("blocks on an unmapped typography slug", () => {
    const report = buildReport(input({ typographySlug: "no-such-pairing" }));
    expect(report.blocking.some((i) => i.code === "missing-font")).toBe(true);
  });

  it("blocks an image below 200 DPI at its placement size", () => {
    // 360pt wide box = 5in; 300 DPI needs 1500px, 200 DPI needs 1000px.
    const report = buildReport(input({
      images: [{ assetId: "a", width: 400, height: 400, boxWidthPt: 360, boxHeightPt: 360 }],
    }));
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "low-resolution")).toBe(true);
  });

  it("warns, but allows, an image between 200 and 300 DPI", () => {
    const report = buildReport(input({
      images: [{ assetId: "a", width: 1200, height: 1200, boxWidthPt: 360, boxHeightPt: 360 }],
    }));
    expect(report.canGenerate).toBe(true);
    expect(report.warnings.some((i) => i.code === "low-resolution")).toBe(true);
  });

  it("accepts an image at or above 300 DPI", () => {
    const report = buildReport(input({
      images: [{ assetId: "a", width: 1500, height: 2100, boxWidthPt: 360, boxHeightPt: 504 }],
    }));
    expect(report.blocking).toHaveLength(0);
    expect(report.warnings.some((i) => i.code === "low-resolution")).toBe(false);
  });

  it("warns when there is no cover image, and when the back would be blank", () => {
    const report = buildReport(input({ hasCover: false, backIsEmpty: true }));
    expect(report.canGenerate).toBe(true);
    expect(report.warnings.some((i) => i.code === "no-cover")).toBe(true);
    expect(report.warnings.some((i) => i.code === "empty-back")).toBe(true);
  });

  it("treats unknown image dimensions as blocking rather than assuming they are fine", () => {
    const report = buildReport(input({
      images: [{ assetId: "a", width: null, height: null, boxWidthPt: 360, boxHeightPt: 360 }],
    }));
    expect(report.canGenerate).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

- [ ] **Step 3: Write `validate.ts`**

```typescript
import type { PageSpec } from "./types";
import { fontFilesFor } from "./fonts";

/**
 * Pre-flight validation — Ph6.md §9.
 *
 * Blocking issues stop generation. The bar is deliberately high for images:
 * a soft photo is invisible on screen and obvious on paper, and by then the
 * job is printed.
 */

export type IssueCode =
  | "missing-field"
  | "text-overflow"
  | "missing-font"
  | "low-resolution"
  | "no-cover"
  | "empty-back";

export interface ValidationIssue {
  code: IssueCode;
  message: string;
}

export interface ValidationReport {
  blocking: ValidationIssue[];
  warnings: ValidationIssue[];
  canGenerate: boolean;
}

export interface ValidateInput {
  spec: PageSpec;
  typographySlug: string;
  completionIssues: { step: string; message: string }[];
  overflows: { field: string; requiredHeight: number; availableHeight: number }[];
  images: {
    assetId: string;
    width: number | null;
    height: number | null;
    boxWidthPt: number;
    boxHeightPt: number;
  }[];
  hasCover: boolean;
  backIsEmpty: boolean;
}

const TARGET_DPI = 300;
const MINIMUM_DPI = 200;

/** Effective DPI of `pixels` spread across `pointsWide`. */
function effectiveDpi(pixels: number, points: number): number {
  return pixels / (points / 72);
}

export function buildReport(input: ValidateInput): ValidationReport {
  const blocking: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const issue of input.completionIssues) {
    blocking.push({ code: "missing-field", message: issue.message });
  }

  for (const overflow of input.overflows) {
    blocking.push({
      code: "text-overflow",
      message: `"${overflow.field}" is too long for the space available on this card size. Shorten it, or choose a larger size.`,
    });
  }

  if (!fontFilesFor(input.typographySlug)) {
    blocking.push({
      code: "missing-font",
      message: `No embeddable print font is mapped for the "${input.typographySlug}" typography.`,
    });
  }

  for (const image of input.images) {
    if (image.width === null || image.height === null) {
      blocking.push({
        code: "low-resolution",
        message: "One photo's dimensions are unknown, so its print quality cannot be checked. Re-upload it.",
      });
      continue;
    }

    const dpi = Math.min(
      effectiveDpi(image.width, image.boxWidthPt),
      effectiveDpi(image.height, image.boxHeightPt),
    );

    if (dpi < MINIMUM_DPI) {
      blocking.push({
        code: "low-resolution",
        message: `A photo is only ${Math.round(dpi)} DPI at its printed size. ${TARGET_DPI} DPI is needed; below ${MINIMUM_DPI} it will look visibly soft.`,
      });
    } else if (dpi < TARGET_DPI) {
      warnings.push({
        code: "low-resolution",
        message: `A photo is ${Math.round(dpi)} DPI at its printed size, under the ${TARGET_DPI} DPI target. It will print acceptably but not crisply.`,
      });
    }
  }

  if (!input.hasCover) {
    warnings.push({ code: "no-cover", message: "No cover photo — the front will be text only." });
  }

  if (input.backIsEmpty) {
    warnings.push({
      code: "empty-back",
      message: "Nothing to print on the back, so this will be a single-sided card.",
    });
  }

  return { blocking, warnings, canGenerate: blocking.length === 0 };
}
```

- [ ] **Step 4: Run it, confirm PASS (9 tests). Commit**

```bash
git add services/pdf/validate.ts services/pdf/validate.test.ts
git commit -m "feat(pdf): validate fields, overflow, fonts and image resolution"
```

---

### Task 14: `services/pdf/paths.ts`, `repository.ts`, `index.ts`

**Files:**
- Create: `services/pdf/paths.ts`, `services/pdf/paths.test.ts`
- Create: `services/pdf/repository.ts`
- Create: `services/pdf/index.ts`

Persistence and the public barrel. The engine's only writes are `PdfGeneration` rows and
one storage object per generation; it never touches customer content.

**Interfaces:**
- Consumes: `prisma`, `isDatabaseConfigured` (`@/lib/db`), `logger`, `uploadFile`,
  `signedUrl`, `BUCKETS` (`@/services/upload/storage`), Task 2's model.
- Produces: `pdfObjectPath(...)`, `GenerationRow`, `PrintInvitation`,
  `findInvitationForPrint`, `nextVersionFor`, `createGeneration`, `markGenerationReady`,
  `markGenerationFailed`, `listGenerations`, `getGenerationForOwner`, `storePdf`,
  `readPdf` — consumed by Tasks 15, 16, 17.

- [ ] **Step 1: Write the failing path test**

Create `services/pdf/paths.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { pdfObjectPath } from "./paths";

describe("pdfObjectPath", () => {
  it("scopes the object under the owning profile", () => {
    expect(pdfObjectPath("profile-1", "inv-1", "gen-1").startsWith("profile-1/")).toBe(true);
  });

  it("gives each generation its own object", () => {
    expect(pdfObjectPath("p", "i", "gen-1")).not.toBe(pdfObjectPath("p", "i", "gen-2"));
  });

  it("ends in .pdf", () => {
    expect(pdfObjectPath("p", "i", "g").endsWith(".pdf")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
pnpm test services/pdf/paths.test.ts
```

Expected: FAIL — cannot resolve `./paths`.

- [ ] **Step 3: Write `paths.ts`**

```typescript
/**
 * Storage layout for generated print files.
 *
 * The profile id leads, exactly as services/media/paths.ts does, because that
 * prefix is what Supabase storage policies match on — an object filed under
 * someone else's prefix is an authorization hole no route check can close.
 *
 * The generation id, not the version number, names the object: rows are
 * append-only, so an object written once is never rewritten and its bytes can
 * be cached forever.
 */
export function pdfObjectPath(
  profileId: string,
  invitationId: string,
  generationId: string,
): string {
  return `${profileId}/print/${invitationId}/${generationId}.pdf`;
}
```

- [ ] **Step 4: Run it, confirm PASS (3 tests)**

- [ ] **Step 5: Write `repository.ts`**

```typescript
import "server-only";

import type { Prisma, PdfGeneration, PdfPageSize } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import { uploadFile, signedUrl, BUCKETS } from "@/services/upload/storage";
import { pdfObjectPath } from "./paths";

/**
 * PDF-generation persistence — Ph6.md §11, §12.
 *
 * Mirrors features/website-generator/repository.ts's shape: every read and
 * write proves ownership in the WHERE clause, through the invitation, rather
 * than trusting the caller to have checked. Returns null on a miss and never
 * distinguishes "not yours" from "does not exist".
 */

export type GenerationRow = PdfGeneration;

const PRINT_INCLUDE = {
  template: { select: { id: true, name: true, version: true, printCompatible: true } },
  hosts: { orderBy: { sortOrder: "asc" } },
  venues: { orderBy: { sortOrder: "asc" } },
  content: true,
  people: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
  program: { orderBy: { sortOrder: "asc" } },
  personalization: true,
  media: {
    orderBy: { sortOrder: "asc" },
    include: { asset: { select: { id: true } } },
  },
} satisfies Prisma.InvitationInclude;

export type PrintInvitation = Prisma.InvitationGetPayload<{
  include: typeof PRINT_INCLUDE;
}>;

/**
 * One invitation with everything print needs, for its owner only.
 *
 * Assets are selected by id alone: the renderer fetches each placed asset in
 * full through services/media, which is the module that owns them. Copying
 * asset columns here would put a second owner of that shape in the system.
 */
export async function findInvitationForPrint(
  profileId: string,
  invitationId: string,
): Promise<PrintInvitation | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      include: PRINT_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "findInvitationForPrint", invitationId });
    return null;
  }
}

/**
 * The next human-facing version number for this invitation.
 *
 * Derived from the highest existing version rather than a count, so deleting a
 * row could never hand out the same number twice.
 */
export async function nextVersionFor(invitationId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 1;

  try {
    const latest = await prisma.pdfGeneration.findFirst({
      where: { invitationId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  } catch (error) {
    logger.report(error, { at: "nextVersionFor", invitationId });
    return 1;
  }
}

export interface CreateGenerationInput {
  invitationId: string;
  version: number;
  pageSize: PdfPageSize;
  generatorVersion: string;
  templateVersion: string | null;
}

/** Records the attempt before any bytes exist, so a crash mid-render leaves a trace. */
export async function createGeneration(
  input: CreateGenerationInput,
): Promise<GenerationRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.pdfGeneration.create({
      data: { ...input, status: "PENDING" },
    });
  } catch (error) {
    logger.report(error, { at: "createGeneration", invitationId: input.invitationId });
    return null;
  }
}

export async function markGenerationReady(
  id: string,
  storagePath: string,
  bytes: number,
  validationReport: unknown,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.pdfGeneration.update({
      where: { id },
      data: {
        status: "READY",
        storagePath,
        bytes,
        validationReport: validationReport as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.report(error, { at: "markGenerationReady", id });
  }
}

export async function markGenerationFailed(
  id: string,
  message: string,
  validationReport: unknown,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.pdfGeneration.update({
      where: { id },
      data: {
        status: "FAILED",
        error: message,
        validationReport: validationReport as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.report(error, { at: "markGenerationFailed", id });
  }
}

/** Newest first — Ph6.md §12's version history. Owner-scoped through the invitation. */
export async function listGenerations(
  profileId: string,
  invitationId: string,
): Promise<GenerationRow[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.pdfGeneration.findMany({
      where: { invitationId, invitation: { profileId } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listGenerations", invitationId });
    return [];
  }
}

/**
 * One generation, for its owner. This is the download route's entire
 * authorization check: the ownership test is the query, not a separate `if`
 * a later edit could drop.
 */
export async function getGenerationForOwner(
  profileId: string,
  generationId: string,
): Promise<GenerationRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.pdfGeneration.findFirst({
      where: { id: generationId, invitation: { profileId } },
    });
  } catch (error) {
    logger.report(error, { at: "getGenerationForOwner", generationId });
    return null;
  }
}

/** Writes the document to the private media bucket. Returns the path, or null. */
export async function storePdf(
  profileId: string,
  invitationId: string,
  generationId: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const path = pdfObjectPath(profileId, invitationId, generationId);
  const file = new File([bytes as BlobPart], `${generationId}.pdf`, {
    type: "application/pdf",
  });

  const result = await uploadFile({
    bucket: BUCKETS.media,
    path,
    file,
    kind: "document",
  });

  if ("code" in result) {
    logger.report(new Error(result.message), { at: "storePdf", path });
    return null;
  }
  return result.path;
}

/**
 * Reads a stored document back for re-serving. Short-lived signed URL: it is
 * used once, server-side, and never reaches the browser — only our own
 * re-served bytes do, exactly as the media proxy route does it.
 */
export async function readPdf(storagePath: string): Promise<ReadableStream | null> {
  const url = await signedUrl(BUCKETS.media, storagePath, 60);
  if (!url) return null;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return null;
  return upstream.body;
}
```

- [ ] **Step 6: Write `index.ts`**

```typescript
import "server-only";

/**
 * PDF engine — the public surface. Ph6.md §15 keeps features depending on
 * services and never the reverse; nothing outside this folder imports
 * services/pdf/* by its internal path.
 */

export type { Cmyk, Box, DrawInstruction, PageSpec, PdfSizeSlug } from "./types";
export { PAGE_SPECS, pageSpecFor, MM_TO_PT } from "./page-specs";
export type { PrintColours } from "./colour";
export { printColours } from "./colour";
export type { MeasureFn } from "./text";
export { wrapText, fitsInBox } from "./text";
export type { PrintFontFamily } from "./fonts";
export { fontFilesFor, loadFontBytes } from "./fonts";
export type { PreparedImage } from "./images";
export { prepareImage, requiredPixelsFor } from "./images";
export type { FrontInput, LayoutResult, OverflowIssue } from "./layout/front";
export { layoutFront } from "./layout/front";
export type { BackInput, BackLayoutResult } from "./layout/back";
export { layoutBack } from "./layout/back";
export type { PrintDocument, RenderInput, FontKey } from "./render";
export { GENERATOR_VERSION, createPrintDocument, renderPdf } from "./render";
export type {
  IssueCode,
  ValidationIssue,
  ValidationReport,
  ValidateInput,
} from "./validate";
export { buildReport } from "./validate";
export { pdfObjectPath } from "./paths";
export type { GenerationRow, PrintInvitation, CreateGenerationInput } from "./repository";
export {
  findInvitationForPrint,
  nextVersionFor,
  createGeneration,
  markGenerationReady,
  markGenerationFailed,
  listGenerations,
  getGenerationForOwner,
  storePdf,
  readPdf,
} from "./repository";
```

- [ ] **Step 7: Type-check, run the suite, commit**

```bash
pnpm typecheck
pnpm test
```

Expected: both exit 0.

```bash
git add services/pdf/paths.ts services/pdf/paths.test.ts services/pdf/repository.ts services/pdf/index.ts
git commit -m "feat(pdf): persist generations and expose the engine barrel"
```

---

### Task 15: Relocate completeness, and write the generation orchestrator

**Files:**
- Move: `features/invitation-builder/completeness.ts` → `lib/invitation/completeness.ts`
- Move: `features/invitation-builder/completeness.test.ts` → `lib/invitation/completeness.test.ts`
- Modify: every importer of the old path
- Create: `features/pdf-generation/generate.ts`

`completionErrors` currently lives in `features/invitation-builder/`, and Phase 6 needs it
from `features/pdf-generation/`. Feature-to-feature imports are forbidden (Ph4.md §15), so
it moves to `lib/invitation/` — the same relocation Phase 5 Task 3 performed on
`preview-model.ts`, for the same reason.

The orchestrator lives in the **feature** layer, not in `services/pdf`, because it is the
only step that needs both the engine and builder-level knowledge of what "complete" means.
`services/pdf` stays a pure engine plus its own persistence.

**Interfaces:**
- Consumes: `@/services/pdf` barrel, `toPreviewModel`, `completionErrors`, `getAsset`.
- Produces: `GenerateInput`, `GenerateOutcome`, `generatePrintFile(input)` — consumed by
  Task 16.

- [ ] **Step 1: Move the file and its test**

```bash
git mv features/invitation-builder/completeness.ts lib/invitation/completeness.ts
git mv features/invitation-builder/completeness.test.ts lib/invitation/completeness.test.ts
```

- [ ] **Step 2: Fix the moved file's own import**

`lib/invitation/completeness.ts` opens with `import { BUILDER_STEPS } from "./steps";`, and
`steps.ts` did not move. Change that line to:

```typescript
import { BUILDER_STEPS } from "@/features/invitation-builder/steps";
```

`completionPercent` is the only function that uses `BUILDER_STEPS`; change nothing else in
the file. This direction (`lib` → feature) is a wart, but the import that actually matters
— feature → feature — is the one being removed.

The moved test imports from `"./completeness"`, which is still correct after the move.
Leave it.

- [ ] **Step 3: Find and fix every other importer**

```bash
rg -n "invitation-builder/completeness|from \"\./completeness\"" --type ts --type tsx
```

Rewrite every hit outside `lib/invitation/` to `@/lib/invitation/completeness`. Then
confirm nothing points at the old path:

```bash
rg -n "invitation-builder/completeness" --type ts --type tsx
```

Expected: no output.

- [ ] **Step 4: Verify and commit the move on its own**

```bash
pnpm typecheck
pnpm test
```

Expected: both exit 0. A move that changes no behaviour should change no test result — if
a test now fails, the move broke something and the commit is not ready.

```bash
git add -A
git commit -m "refactor(invitation): move completeness to lib for cross-feature use"
```

- [ ] **Step 5: Write `features/pdf-generation/generate.ts`**

```typescript
import "server-only";

import { logger } from "@/lib/logger";
import { toPreviewModel, type PreviewInput } from "@/lib/invitation/preview-model";
import { completionErrors } from "@/lib/invitation/completeness";
import { getAsset, type AssetRow } from "@/services/media";
import {
  GENERATOR_VERSION,
  buildReport,
  createGeneration,
  createPrintDocument,
  findInvitationForPrint,
  layoutBack,
  layoutFront,
  markGenerationFailed,
  markGenerationReady,
  nextVersionFor,
  pageSpecFor,
  printColours,
  renderPdf,
  storePdf,
  type PdfSizeSlug,
  type PrintDocument,
  type ValidationReport,
} from "@/services/pdf";

/**
 * Generation orchestration — Ph6.md §1, §9, §11.
 *
 * Order matters and is the whole point of this file: embed fonts, measure with
 * their real metrics, lay out, validate what layout reported, and only then
 * render. Measuring against guessed widths and rendering against real ones is
 * how text that passed validation ends up clipped on the press.
 */

export interface GenerateInput {
  profileId: string;
  invitationId: string;
  pageSize: PdfSizeSlug;
  cropMarks: boolean;
}

export type GenerateOutcome =
  | { ok: true; generationId: string; version: number; report: ValidationReport }
  | { ok: false; report: ValidationReport | null; message: string };

export async function generatePrintFile(
  input: GenerateInput,
): Promise<GenerateOutcome> {
  const invitation = await findInvitationForPrint(input.profileId, input.invitationId);
  if (!invitation) {
    return { ok: false, report: null, message: "That invitation could not be found." };
  }

  const spec = pageSpecFor(input.pageSize);
  const themeSlug = invitation.personalization?.colorTheme ?? "classic-ivory";
  const typographySlug = invitation.personalization?.typography ?? "classic-serif";
  const colours = printColours(themeSlug);
  const hidden = new Set(invitation.personalization?.hiddenSections ?? []);

  // mediaUrls is deliberately empty: print addresses assets by id and fetches
  // their bytes from storage itself. The preview model's URLs exist for the
  // browser, and a print renderer has no use for one.
  const model = toPreviewModel({
    eventTitle: invitation.eventTitle,
    subtitle: invitation.subtitle,
    eventDate: invitation.eventDate,
    eventTime: invitation.eventTime,
    timeZone: invitation.timeZone,
    rsvpDeadline: invitation.rsvpDeadline,
    dressCode: invitation.dressCode,
    eventTheme: invitation.eventTheme,
    language: invitation.language,
    hosts: invitation.hosts,
    venues: invitation.venues,
    content: invitation.content,
    people: invitation.people,
    program: invitation.program,
    personalization: invitation.personalization,
    mediaUrls: {},
  } satisfies PreviewInput);

  const coverAssetId =
    invitation.media.find((link) => link.slot === "COVER")?.asset.id ?? null;

  const completion = completionErrors({
    templateId: invitation.templateId,
    eventTitle: invitation.eventTitle,
    eventDate: invitation.eventDate,
    hostCount: invitation.hosts.length,
    venueCount: invitation.venues.length,
  });

  // Fonts first — layout measures against these exact metrics.
  let printDoc: PrintDocument;
  try {
    printDoc = await createPrintDocument(typographySlug);
  } catch (error) {
    logger.report(error, { at: "generatePrintFile.fonts", typographySlug });
    return {
      ok: false,
      report: buildReport({
        spec,
        typographySlug,
        completionIssues: completion,
        overflows: [],
        images: [],
        hasCover: coverAssetId !== null,
        backIsEmpty: true,
      }),
      message: "This invitation's typography has no print font.",
    };
  }

  const front = layoutFront({
    spec,
    colours,
    measure: printDoc.measure,
    title: model.title,
    subtitle: model.subtitle,
    dateLine: model.dateLine,
    timeLine: model.timeLine,
    hostNames: model.hosts.map((host) => host.name),
    invitationMessage: model.invitationMessage,
    venueLines: model.venues.map((venue) =>
      [venue.label, venue.name, venue.address].filter(Boolean).join(" — "),
    ),
    coverAssetId,
    hidden,
  });

  const back = layoutBack({
    spec,
    colours,
    measure: printDoc.measure,
    parents: model.parents.map((person) => person.name),
    sponsors: model.sponsors.map((person) => person.name),
    programme: model.program.map((item) => ({ time: item.time, title: item.title })),
    dressCode: model.dressCode,
    giftsPreference: model.giftsPreference,
    specialNotes: model.specialNotes,
    rsvpLine: model.rsvpLine,
    hidden,
  });

  // Only assets layout actually placed are fetched and DPI-checked. Checking
  // every asset on the invitation would block generation over a photo that
  // never reaches the card.
  const placed = [...front.instructions, ...back.instructions].filter(
    (item): item is Extract<typeof item, { kind: "image" }> => item.kind === "image",
  );

  const assetsById = new Map<string, AssetRow>();
  const images: {
    assetId: string;
    width: number | null;
    height: number | null;
    boxWidthPt: number;
    boxHeightPt: number;
  }[] = [];

  for (const item of placed) {
    const asset = await getAsset(input.profileId, item.assetId);
    if (!asset) continue;
    assetsById.set(asset.id, asset);
    images.push({
      assetId: asset.id,
      width: asset.width,
      height: asset.height,
      boxWidthPt: item.box.width,
      boxHeightPt: item.box.height,
    });
  }

  const report = buildReport({
    spec,
    typographySlug,
    completionIssues: completion,
    overflows: [...front.overflows, ...back.overflows],
    images,
    hasCover: coverAssetId !== null,
    backIsEmpty: back.isEmpty,
  });

  if (!report.canGenerate) {
    // No row is written for a run that never started. A PdfGeneration row means
    // "we tried to build a file"; refusing on pre-flight is the system working,
    // not a failed generation, and recording it as one would make the version
    // history unreadable.
    return { ok: false, report, message: "This invitation is not ready to print yet." };
  }

  const version = await nextVersionFor(input.invitationId);
  const row = await createGeneration({
    invitationId: input.invitationId,
    version,
    pageSize: input.pageSize,
    generatorVersion: GENERATOR_VERSION,
    templateVersion: invitation.template?.version ?? null,
  });
  if (!row) {
    return { ok: false, report, message: "Could not start the print file. Try again." };
  }

  try {
    // A back with nothing on it is not printed: a blank second side costs money
    // at the press and reads as a mistake (design doc Decision 3).
    const pages = back.isEmpty
      ? [front.instructions]
      : [front.instructions, back.instructions];

    const bytes = await renderPdf(printDoc, {
      spec,
      pages,
      cropMarks: input.cropMarks,
      assetsById,
      metadata: {
        invitationId: invitation.id,
        profileId: input.profileId,
        templateVersion: invitation.template?.version ?? null,
      },
    });

    const path = await storePdf(input.profileId, invitation.id, row.id, bytes);
    if (!path) {
      await markGenerationFailed(row.id, "Storage write failed.", report);
      return { ok: false, report, message: "Could not save the print file. Try again." };
    }

    await markGenerationReady(row.id, path, bytes.byteLength, report);
    return { ok: true, generationId: row.id, version, report };
  } catch (error) {
    logger.report(error, { at: "generatePrintFile.render", invitationId: invitation.id });
    await markGenerationFailed(row.id, "Rendering failed.", report);
    return { ok: false, report, message: "Something went wrong building the file." };
  }
}
```

- [ ] **Step 6: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add features/pdf-generation/generate.ts
git commit -m "feat(pdf): orchestrate layout, validation, render and storage"
```

---

### Task 16: Server Action and the authenticated download route

**Files:**
- Create: `features/pdf-generation/actions.ts`
- Create: `app/api/pdf/[generationId]/route.ts`

**Interfaces:**
- Consumes: `generatePrintFile`, `getGenerationForOwner`, `readPdf`, `getProfile`
  (`@/lib/auth/session`), `features`/`routes` (`@/lib/config`).
- Produces: `PrintActionState`, `initialPrintState`, `generatePrintFileAction` — consumed
  by Task 17.

- [ ] **Step 1: Write `actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { features, routes } from "@/lib/config";
import { generatePrintFile } from "./generate";
import type { PdfSizeSlug, ValidationReport } from "@/services/pdf";

/**
 * Print Server Actions — Ph6.md §1.
 *
 * Mirrors features/website-generator/actions.ts: authenticate, check the flag,
 * parse, delegate, revalidate. The action renders nothing itself.
 */

export interface PrintActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  report: ValidationReport | null;
  generationId: string | null;
}

export const initialPrintState: PrintActionState = {
  status: "idle",
  message: null,
  report: null,
  generationId: null,
};

const SIZES: readonly PdfSizeSlug[] = ["FIVE_BY_SEVEN", "A5", "A6"];

function fail(
  message: string,
  report: ValidationReport | null = null,
): PrintActionState {
  return { status: "error", message, report, generationId: null };
}

export async function generatePrintFileAction(
  _previous: PrintActionState,
  formData: FormData,
): Promise<PrintActionState> {
  if (!features.pdfGeneration) {
    return fail("Print file generation is not available on this deployment.");
  }

  const profile = await getProfile();
  if (!profile) return fail("Please sign in and try again.");

  const invitationId = String(formData.get("invitationId") ?? "");
  const rawSize = String(formData.get("pageSize") ?? "");
  const cropMarks = formData.get("cropMarks") === "on";

  if (!invitationId) return fail("Missing invitation.");
  if (!(SIZES as readonly string[]).includes(rawSize)) {
    return fail("Choose a valid card size.");
  }

  const outcome = await generatePrintFile({
    profileId: profile.id,
    invitationId,
    pageSize: rawSize as PdfSizeSlug,
    cropMarks,
  });

  if (!outcome.ok) return fail(outcome.message, outcome.report);

  revalidatePath(routes.dashboard.eventPrint(invitationId));

  return {
    status: "success",
    message: `Version ${outcome.version} is ready to download.`,
    report: outcome.report,
    generationId: outcome.generationId,
  };
}
```

- [ ] **Step 2: Write the download route**

Create `app/api/pdf/[generationId]/route.ts`:

```typescript
import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { getGenerationForOwner, readPdf } from "@/services/pdf";

/**
 * Authenticated download — Ph6.md §11.
 *
 * A single authorization path, unlike the media proxy's two: a print file has
 * no public audience. Guests see the website; the press-ready file, with the
 * customer's photos at full resolution, belongs to its owner alone. Every dead
 * end returns the same 404, so the route never reveals which one it was.
 *
 * Never Edge: reaches Supabase through the cookie-based server client.
 */
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { generationId: string } },
) {
  const profile = await getProfile();
  if (!profile) return new Response("Not found", { status: 404 });

  const generation = await getGenerationForOwner(profile.id, params.generationId);
  if (!generation || generation.status !== "READY" || !generation.storagePath) {
    return new Response("Not found", { status: 404 });
  }

  const body = await readPdf(generation.storagePath);
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      // attachment, not inline: this is a file to hand a printer, and a name
      // the customer recognises beats a uuid in their downloads folder.
      "Content-Disposition": `attachment; filename="invitation-v${generation.version}.pdf"`,
      // Rows are append-only and the object is never rewritten, so these bytes
      // are immutable. `private` because the file belongs to one customer and
      // must never sit in a shared cache.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 3: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add features/pdf-generation/actions.ts "app/api/pdf/[generationId]/route.ts"
git commit -m "feat(pdf): add the generate action and authenticated download route"
```

---

### Task 17: Print page, panel, and the draft menu entry

**Files:**
- Create: `features/pdf-generation/components/print-panel.tsx`
- Create: `app/(dashboard)/dashboard/events/[id]/print/page.tsx`
- Modify: `features/invitation-builder/components/draft-menu.tsx`

**Interfaces:**
- Consumes: `generatePrintFileAction`, `initialPrintState`, `findInvitationForPrint`,
  `listGenerations`, `routes.dashboard.eventPrint`.
- Produces: the customer-facing surface. Nothing imports from it.

- [ ] **Step 1: Write `print-panel.tsx`**

```tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { generatePrintFileAction, initialPrintState } from "../actions";

/**
 * The print form and its result — Ph6.md §1, §9.
 *
 * Blocking issues and warnings are styled differently on purpose. A warning the
 * customer can proceed past, dressed as an error, teaches them to ignore the
 * real errors too.
 */

const SIZES = [
  { value: "FIVE_BY_SEVEN", label: '5" × 7" (127 × 178 mm)' },
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "A6", label: "A6 (105 × 148 mm)" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Building the file…" : "Generate print file"}
    </Button>
  );
}

export function PrintPanel({ invitationId }: { invitationId: string }) {
  const [state, formAction] = useFormState(generatePrintFileAction, initialPrintState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="invitationId" value={invitationId} />

        <div className="space-y-2">
          <Label htmlFor="pageSize">Card size</Label>
          <select
            id="pageSize"
            name="pageSize"
            defaultValue="FIVE_BY_SEVEN"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="cropMarks" defaultChecked className="size-4" />
          Include crop marks and bleed
        </label>

        <SubmitButton />
      </form>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.report && state.report.blocking.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Fix these before printing</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {state.report.blocking.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.report && state.report.warnings.length > 0 ? (
        <div className="rounded-md border bg-muted p-4">
          <p className="text-sm font-medium">Worth a look</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {state.report.warnings.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

Create `app/(dashboard)/dashboard/events/[id]/print/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { features, routes } from "@/lib/config";
import { findInvitationForPrint, listGenerations } from "@/services/pdf";
import { PrintPanel } from "@/features/pdf-generation/components/print-panel";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Print file — ML-DEP" };

export default async function PrintPage({ params }: { params: { id: string } }) {
  if (!features.pdfGeneration) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.signIn);

  const invitation = await findInvitationForPrint(profile.id, params.id);
  if (!invitation) notFound();

  const generations = await listGenerations(profile.id, params.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Print file</h1>
        <p className="text-sm text-muted-foreground">
          A press-ready PDF of “{invitation.title}” — CMYK, 3 mm bleed, fonts embedded.
        </p>
      </header>

      <PrintPanel invitationId={invitation.id} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Previous versions</h2>
        {generations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing generated yet. Every file you build is kept here.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {generations.map((generation) => (
              <li
                key={generation.id}
                className="flex items-center justify-between gap-4 p-3 text-sm"
              >
                <span>
                  Version {generation.version} · {generation.pageSize.replace(/_/g, " ")} ·{" "}
                  {generation.createdAt.toLocaleDateString()}
                  {generation.bytes ? ` · ${formatBytes(generation.bytes)}` : ""}
                </span>
                {generation.status === "READY" ? (
                  <Link href={`/api/pdf/${generation.id}`} className="font-medium underline">
                    Download
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {generation.status === "FAILED" ? "Failed" : "Building…"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

`routes.signIn` is the sign-in path as `lib/config/routes.ts` names it. If the key differs,
use whatever `app/(dashboard)/dashboard/events/[id]/website/page.tsx` redirects to — copy
that line rather than inventing one.

- [ ] **Step 3: Add the draft menu entry**

In `features/invitation-builder/components/draft-menu.tsx`, the "Manage website" and "View
RSVPs" entries already sit inside a `status === "COMPLETED"` block. Add a third entry
there, after "View RSVPs", gated on the flag:

```tsx
            {features.pdfGeneration ? (
              <DropdownMenuItem asChild>
                <Link href={routes.dashboard.eventPrint(invitationId)}>
                  <Printer aria-hidden="true" />
                  Print file
                </Link>
              </DropdownMenuItem>
            ) : null}
```

Extend the two existing imports at the top of the file:

```tsx
import { MoreVertical, Trash2, Pencil, Globe, Users, Printer } from "lucide-react";
import { routes, features } from "@/lib/config";
```

- [ ] **Step 4: Type-check, lint, commit**

```bash
pnpm typecheck
pnpm lint
```

Expected: both exit 0.

```bash
git add features/pdf-generation/components/print-panel.tsx "app/(dashboard)/dashboard/events/[id]/print/page.tsx" features/invitation-builder/components/draft-menu.tsx
git commit -m "feat(pdf): add the print page, panel and draft menu entry"
```

---

### Task 18: Verification, docs, CHANGELOG

**Files:**
- Delete: `services/pdf/spike-cmyk.md`, and `cmyk-spike.mjs` / `cmyk-spike.pdf` if either survived Task 1
- Create: `docs/print-pipeline.md`
- Modify: `docs/architecture.md`, `docs/development-workflow.md`, `CHANGELOG.md`

**Interfaces:** none — this task ships the phase.

- [ ] **Step 1: Full automated verification**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all four exit 0. If `pnpm test` reports thousands of tests, `vitest.config.ts`'s
`exclude` has regressed — it must use glob patterns (`**/node_modules/**`), never bare
directory names.

- [ ] **Step 2: Manual print verification — the part automation cannot do**

Run `pnpm dev`, sign in, open a completed draft that has a cover photo, a date, a host and
a venue, go to its Print file page, and generate one. Download it and check, in order:

1. **It opens** in a PDF viewer with no warning.
2. **Page size** is trim + 6 mm — 3 mm bleed on every edge. For 5×7 that is 133 × 184 mm.
3. **Two pages**, unless every back section is hidden or empty; then one.
4. **Crop marks** sit outside the trim box and never cross into the artwork.
5. **Colour is CMYK, not RGB.** Verify it, do not assume it — and do **not** grep the raw
   file for `/DeviceCMYK`. That check produces a false negative on a real card, which was
   confirmed empirically during Task 12: pdf-lib writes vector and text colour as `k` / `K`
   **content-stream operators**, not as a named colourspace, and those streams are
   Flate-compressed. `/DeviceCMYK` appears only in an image XObject's dictionary, so a
   text-only card shows `DeviceCMYK: false` while being perfectly correct.

   Decompress the streams and count colour operators instead. Save as `cmyk-verify.mjs` at
   the repo root (module resolution fails elsewhere in this project) and run it against the
   downloaded file:

   ```javascript
   import { readFileSync } from "node:fs";
   import zlib from "node:zlib";

   const buf = readFileSync(process.argv[2]);
   const txt = buf.toString("latin1");
   let idx = 0, all = "";
   while (true) {
     const s = txt.indexOf("stream", idx);
     if (s === -1) break;
     if (txt.slice(s - 3, s) === "end") { idx = s + 6; continue; }
     let b = s + 6;
     if (txt[b] === "\r") b++;
     if (txt[b] === "\n") b++;
     const e = txt.indexOf("endstream", b);
     if (e === -1) break;
     const raw = buf.subarray(b, e);
     try { all += zlib.inflateSync(raw).toString("latin1") + "\n"; }
     catch { all += raw.toString("latin1") + "\n"; }
     idx = e + 9;
   }
   const c = (re) => (all.match(re) || []).length;
   console.log({
     cmykFill: c(/[\d.]+ [\d.]+ [\d.]+ [\d.]+ k\b/g),
     cmykStroke: c(/[\d.]+ [\d.]+ [\d.]+ [\d.]+ K\b/g),
     rgb: c(/[\d.]+ [\d.]+ [\d.]+ rg\b/g) + c(/[\d.]+ [\d.]+ [\d.]+ RG\b/g),
     gray: c(/\n[\d.]+ [gG]\b/g),
     imageColourSpace: txt.includes("DeviceCMYK") ? "DeviceCMYK" : (txt.includes("DeviceRGB") ? "DeviceRGB" : "none"),
   });
   ```

   Expected: `cmykFill` greater than zero, `rgb` and `gray` both **zero**. If the card has a
   photo, `imageColourSpace` must be `DeviceCMYK`. Any non-zero `rgb` or `gray` means
   something drew outside the CMYK path — find it before shipping. A press converts RGB
   silently and the colour shifts.
6. **Fonts are embedded.** Document Properties → Fonts: every entry reads "Embedded
   Subset". A font that is not embedded is the most common reason a print job comes back
   wrong.
7. **No text is clipped** at any edge, and nothing important sits inside the 5 mm safe
   margin.
8. **Regenerate** with the same inputs: a version 2 row appears and version 1 is still
   downloadable.
9. **Cross-customer check:** copy the `/api/pdf/<generationId>` URL, sign in as a different
   customer, open it. Expected: 404, not the file.

Fix anything that fails before Step 3.

- [ ] **Step 3: Remove the spike**

```bash
rm -f services/pdf/spike-cmyk.md cmyk-spike.mjs cmyk-spike.pdf
```

The spike's *conclusion* belongs in `docs/print-pipeline.md` (Step 4), not in a stray file
under `services/`.

- [ ] **Step 4: Write `docs/print-pipeline.md`**

````markdown
# Print pipeline

Phase 6. Turns an invitation into a press-ready PDF. Spec:
`docs/superpowers/specs/2026-07-20-phase6-pdf-generation-design.md`.

## Shape

```
features/pdf-generation/     orchestration, Server Action, UI
  generate.ts                the only module that knows both engine and builder
services/pdf/                the engine — nothing but the above imports it
  types.ts, page-specs.ts    geometry, in points
  colour.ts                  theme slug -> CMYK
  text.ts                    measurement, wrapping, overflow
  fonts.ts                   typography slug -> SIL OFL TTF files
  images.ts                  fetch, resize to 300 DPI, convert to CMYK
  layout/front.ts, back.ts   DrawInstruction[] — pure, unit-tested
  render.ts                  the only pdf-lib importer
  validate.ts                pre-flight report
  repository.ts, paths.ts    PdfGeneration rows and storage objects
```

Layout returns instructions rather than drawing. That is what lets a layout be asserted on
in a unit test without producing a PDF, and it is why `render.ts` is the only file in the
tree that imports pdf-lib.

Order of operations in `generate.ts` is load-bearing: embed fonts, measure with their real
metrics, lay out, validate the overflows layout reported, then render. Measuring against
guessed widths and rendering against real ones is how text that passed validation ends up
clipped on the press.

## Print facts worth keeping

- **Colour is CMYK end to end.** `pdf-lib`'s `cmyk()` for fills and text,
  `sharp().toColourspace("cmyk")` for photos. Nothing in the output may be `/DeviceRGB`.
- **Neutral foregrounds are K-only** (`[0,0,0,k]`). Four-colour black misregisters at
  body-copy sizes and reads as a blurred edge. Large flood fills are the exception —
  midnight-navy's background is deliberately a rich four-ink build.
- **3 mm bleed, 5 mm safe margin, 300 DPI.** Media size is trim + 6 mm. An image under
  200 DPI at its placed size blocks generation; 200–300 warns.
- **Fonts must be embeddable.** Every typeface here is SIL OFL and ships in `assets/fonts/`
  alongside a per-family `assets/fonts/OFL-*.txt`. Static cuts only — a variable font
  embeds at its default weight, so "bold" would print as regular. System fonts are not an
  option either: most are not licensed
  for embedding. `@pdf-lib/fontkit` must be registered on the document or pdf-lib refuses
  custom TTFs outright.
- **A blank back is not printed.** It costs money at the press and reads as a mistake.

## Traceability

`PdfGeneration` rows are append-only. Each records `generatorVersion` (a hand-bumped
constant in `services/pdf/render.ts`), the template version at generation time, and the
validation report. Bump `GENERATOR_VERSION` whenever a change would alter output for
unchanged input — that is what makes "reproducible from the same inputs" checkable.

Files live in the private `media` bucket under `<profileId>/print/…` and are served only
through `app/api/pdf/[generationId]/route.ts`, which authorizes by ownership in the query
itself.
````

- [ ] **Step 5: Update the existing docs**

In `docs/architecture.md`, add `services/pdf` and `features/pdf-generation` to the module
map beside the existing services, one line each, matching the surrounding style, and link
`docs/print-pipeline.md`.

In `docs/development-workflow.md`, under Setup, note that `assets/fonts/` is committed to
the repository and needs no extra install step.

- [ ] **Step 6: Update `CHANGELOG.md`**

Add a Phase 6 entry above Phase 5's, matching the format already there:

```markdown
## Phase 6 — PDF Generation

- Press-ready PDF export: true CMYK, 3 mm bleed, 5 mm safe margin, crop marks,
  300 DPI images, embedded SIL OFL fonts.
- Two-sided card: event details on the front, names and practical details on
  the back. A back with nothing on it is not printed.
- Pre-flight validation blocks generation on missing fields, text that will not
  fit, unmapped fonts, and photos under 200 DPI; warns between 200 and 300.
- Version history: every generated file is kept and stays downloadable, behind
  an ownership-checked download route.
- `completeness.ts` moved from `features/invitation-builder/` to
  `lib/invitation/` so print and the builder can share it without a
  feature-to-feature import.
```

- [ ] **Step 7: Final verification and commit**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all four exit 0.

```bash
git add -A
git commit -m "docs(pdf): document the print pipeline and close out Phase 6"
```

---

## Self-Review

**1. Spec coverage.** Every section of
`docs/superpowers/specs/2026-07-20-phase6-pdf-generation-design.md` maps to a task:

| Spec area | Task |
|---|---|
| Generate a print file | 15, 16, 17 |
| Page sizes | 6 |
| Two-sided layout, blank-back rule | 10, 11, 15 |
| True CMYK | 1, 5, 7, 9, 12 |
| Bleed, trim, safe area, crop marks | 6, 12 |
| 300 DPI images | 9, 13 |
| Embedded fonts (SIL OFL swap) | 4, 5, 12 |
| Section visibility follows the builder | 10, 11 |
| Pre-flight validation | 13, 17 |
| Private storage, authenticated download | 14, 16 |
| Traceability and reproducibility | 2, 12, 14 |
| Version history | 2, 14, 17 |
| Feature flag and routes | 3, 16, 17 |
| Tests | 6, 7, 8, 10, 11, 13, 14 |
| Module boundaries | 14 (barrel), 15 (completeness relocation) |

**2. Placeholder scan.** No "TBD", no "add error handling", no "similar to Task N", no step
that describes code without showing it. Task 1 is the one task whose *outcome* is not
predetermined — that is what a spike is for, and its fallback is written down in the design
doc rather than left open.

**3. Type consistency.** Names are used identically across tasks: `pageSpecFor`,
`printColours`, `MeasureFn`, `fitsInBox`, `layoutFront`/`layoutBack`,
`LayoutResult`/`BackLayoutResult`, `OverflowIssue`, `buildReport`, `ValidationReport`,
`createPrintDocument`/`renderPdf`, `PrintDocument`, `GENERATOR_VERSION`, `pdfObjectPath`,
`generatePrintFile`, `generatePrintFileAction`, `PdfSizeSlug`.

Four defects were found and fixed inline during this review:

1. **Task 12 could not have worked as first written.** It embedded fonts inside `renderPdf`,
   which left layout — running earlier — with no way to measure against real metrics. Split
   into `createPrintDocument` (embeds, returns a `MeasureFn`) and `renderPdf` (draws), with
   Task 15 sequencing them.
2. **`@pdf-lib/fontkit` was missing entirely.** pdf-lib refuses to embed a custom TTF
   without `doc.registerFontkit(fontkit)`, and every typeface in this phase is a custom TTF.
   Added to Task 1's install and Task 12's document setup.
3. **A forbidden feature-to-feature import.** `completionErrors` lives in
   `features/invitation-builder/`, and `features/pdf-generation/` needs it. Task 15
   relocates it to `lib/invitation/`, mirroring what Phase 5 did with `preview-model.ts`.
4. **Stale "consumed by" pointers** in Tasks 9, 10, 12 and 13 named Task 16 as the
   orchestrator before Task 15 existed. Corrected, so a subagent reading one task in
   isolation is pointed at the right neighbour.
