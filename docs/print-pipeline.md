# Print pipeline

Phase 6. Turns an invitation into a press-ready PDF. Spec:
`docs/superpowers/specs/2026-07-20-phase6-pdf-generation-design.md`.

## Shape

```
features/pdf-generation/     orchestration, Server Action, UI
  generate.ts                the only module that knows both engine and builder
  actions.ts                 authenticate, check the flag, delegate, revalidate
  components/print-panel.tsx the form and its validation report
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
  index.ts                   the barrel; nothing outside imports past it
```

Layout returns instructions rather than drawing. That is what lets a layout be asserted on
in a unit test without producing a PDF, and it is why `render.ts` is the only file in the
tree that imports pdf-lib.

Order of operations in `generate.ts` is load-bearing: embed fonts, measure with their real
metrics, lay out, validate the overflows layout reported, then render. Measuring against
guessed widths and rendering against real ones is how text that passed validation ends up
clipped on the press. This is why `render.ts` exposes `createPrintDocument` separately from
`renderPdf` — the caller needs a `MeasureFn` backed by embedded fonts *before* layout runs.

## Print facts worth keeping

- **Colour is CMYK end to end.** `pdf-lib`'s `cmyk()` for fills and text,
  `sharp().toColourspace("cmyk")` for photos.
- **Neutral dark foregrounds are K-only** (`[0,0,0,k]`). Four-colour black misregisters at
  body-copy sizes and reads as a blurred edge. Large flood fills are the exception —
  `midnight-navy`'s background is deliberately a rich four-ink build.
- **3 mm bleed, 5 mm safe margin, 300 DPI.** Media size is trim + 6 mm; a 5×7" card is
  therefore 377 × 521 pt. An image under 200 DPI at its placed size blocks generation;
  200–300 warns.
- **Fonts must be embeddable and STATIC.** Crimson Text, Lato, Spectral and Great Vibes,
  all SIL OFL, in `assets/fonts/` with a per-family `OFL-*.txt`. Lora, Inter and Playfair
  Display were rejected: `google/fonts` now ships them as variable fonts only, and pdf-lib
  embeds a variable font's *default instance* — every bold face would print at regular
  weight. `@pdf-lib/fontkit` must be registered on the document or pdf-lib refuses custom
  TTFs outright.
- **A blank back is not printed.** It costs money at the press and reads as a mistake.

## Verifying colour in a generated PDF

Do **not** grep the file for `/DeviceCMYK`. That gives a false negative on a text-only
card: pdf-lib writes vector and text colour as `k` / `K` **content-stream operators**, not
a named colourspace, and those streams are Flate-compressed. `/DeviceCMYK` appears only in
an image XObject's dictionary.

Inflate the streams and count colour operators instead — see Task 18, Step 2 of
`docs/superpowers/plans/2026-07-20-phase6-pdf-generation.md` for the script. Expect
`cmykFill` above zero and `rgb`/`gray` at zero.

## Traceability

`PdfGeneration` rows are append-only. Each records `generatorVersion` (a hand-bumped
constant in `services/pdf/render.ts`), the template version at generation time, and the
validation report. Bump `GENERATOR_VERSION` whenever a change would alter output for
unchanged input — that is what makes "reproducible from the same inputs" checkable.

Files live in the private `media` bucket under `<profileId>/print/…` and are served only
through `app/api/pdf/[generationId]/route.ts`, which authorizes by ownership in the query
itself.

## Testing note

`vitest.config.ts` aliases `server-only` to its `empty.js`. That module throws on import to
fail a *client* bundle at build time; vitest runs in Node, the environment these modules are
written for, so the guard is inverted there and would make every server module untestable.
Next still resolves the real module, so the build-time protection is unchanged.
