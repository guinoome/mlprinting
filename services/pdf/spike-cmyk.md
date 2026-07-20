# Spike: can pdf-lib embed a true 4-channel CMYK JPEG?

**Task:** Task 1, Phase 6 (PDF Generation). Deleted by Task 18 at the end of the phase.

**Question:** Does `pdf-lib`'s `embedJpg` accept a genuine 4-channel CMYK JPEG (produced by
`sharp(...).toColourspace("cmyk").jpeg()`), and does the resulting PDF actually declare
`/DeviceCMYK` for that image (not `/DeviceRGB`)?

## Environment

- Node: v24.16.0
- pnpm: 11.13.1
- `sharp`: 0.35.3 (pre-existing dependency)
- `pdf-lib`: 1.17.1 (added this task)
- `@pdf-lib/fontkit`: 1.1.1 (added this task, required for custom TTF embedding in later tasks)

Both new packages landed under `"dependencies"` in `package.json` (not `devDependencies`),
as required — they're used at runtime by a Route Handler, not just in tests.

## What was run

`cmyk-spike.mjs` at the repo root (verbatim from the task brief), then deleted per Step 4:

```javascript
import { PDFDocument, cmyk } from "pdf-lib";
import sharp from "sharp";
import { writeFileSync } from "node:fs";

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

Command: `node ./cmyk-spike.mjs`

### Raw console output

```
image space: cmyk channels: 4
RESULT: embedJpg ACCEPTED a 4-channel CMYK JPEG
wrote cmyk-spike.pdf
```

No exception was thrown. `embedJpg` accepted the 4-channel CMYK JPEG on the first try; no
fallback path was needed.

## Verification beyond "it didn't throw"

An exception-free run only proves `embedJpg` didn't reject the buffer — it doesn't by itself
prove the output PDF is actually `/DeviceCMYK` (pdf-lib could in principle have silently
converted to RGB). Acrobat was not available in this environment, so Output Preview
separations could not be checked, and the local PDF-viewer tool available in this session had
no allowed local directories configured, so a rendered visual check was also not possible.
**Visual/Acrobat confirmation is unverified for this reason.**

To compensate, the generated `cmyk-spike.pdf` was inspected directly at the byte level
(Node script reading the file as latin1 and locating the uncompressed object dictionaries and
inflating the FlateDecode content stream). This is stronger than a visual check for the
specific question asked (device colour space used), even though it doesn't confirm on-screen
rendering.

Findings from raw-byte inspection of `cmyk-spike.pdf`:

**Image XObject dictionary** (the embedded JPEG object):

```
<<
/Type /XObject
/Subtype /Image
/BitsPerComponent 8
/Width 600
/Height 400
/ColorSpace /DeviceCMYK
/Filter /DCTDecode
/Decode [ 1 0 1 0 1 0 1 0 ]
/Length 3928
>>
stream
ÿØÿî...  (raw JPEG bytes, embedded directly, not re-encoded)
```

- `/ColorSpace /DeviceCMYK` — the image is declared as true CMYK, not RGB.
- `/Filter /DCTDecode` — the original JPEG bytes are embedded as-is (pdf-lib does not
  decode/re-encode the pixel data), so no colour-managed re-encoding step could have
  silently converted the channels.
- `/Decode [ 1 0 1 0 1 0 1 0 ]` — pdf-lib detected the Adobe APP14 marker in the JPEG (the
  `Adobe` string visible immediately after the JPEG SOI/APP0 bytes in the stream) and added
  the standard inversion decode array Adobe-flavoured CMYK JPEGs require. This is existing,
  deliberate pdf-lib behaviour for CMYK JPEGs, not an accident — it indicates pdf-lib has
  real support for this format, not just "didn't crash."

**Page content stream** (decompressed from FlateDecode):

```
q
0 0.02 0.05 0.04 k        <- background rectangle fill, CMYK 'k' operator
0 w
...
f
Q
q
BT
0 0 0 1 k                 <- text fill, CMYK 'k' operator (100% K, i.e. rich/true black)
/Helvetica-... 24 Tf
...
Tj
...
ET
Q
q
...
/Image-... Do              <- the embedded CMYK JPEG, drawn via Do
Q
```

- Both the vector fill (background rectangle) and the text use the CMYK `k` operator. Zero
  occurrences of the RGB `rg`/`RG` operators anywhere in the content stream.

**Whole-file scan** (`grep`/byte search across the entire PDF, not just the objects shown
above):

- `/DeviceCMYK` — 1 occurrence (the image XObject above).
- `/DeviceRGB` — 0 occurrences anywhere in the file.
- `/DeviceGray` — 0 occurrences anywhere in the file.

This confirms the whole document — vector fills, text, and the embedded photo — is
`/DeviceCMYK` end to end, with no `/DeviceRGB` anywhere, which is exactly the global
constraint this phase must satisfy.

## Conclusion

**ACCEPTED.** `pdf-lib@1.17.1`'s `embedJpg` embeds a true 4-channel CMYK JPEG (produced by
`sharp.toColourspace("cmyk").jpeg()`) directly and losslessly (`DCTDecode` passthrough, no
recompression), and the resulting PDF correctly declares `/ColorSpace /DeviceCMYK` on that
image object. Combined with `cmyk()`-based fills/text using the CMYK `k`/`K` content-stream
operators, the whole generated PDF is `/DeviceCMYK` with zero `/DeviceRGB` or `/DeviceGray`
anywhere in the file.

The one gap is that visual rendering and an Acrobat Output Preview separations check were not
possible in this environment (no Acrobat, no local PDF rasterizer such as poppler/ghostscript/
mupdf on PATH, and the session's PDF-viewer tool had no allowed local directories). This is
recorded as **unverified** per the task brief's own allowance, but the byte-level evidence
above is direct proof of the colour space actually written to the file, which is the
substance of what a visual/separations check would have confirmed.

## Consequence for Task 9 (`services/pdf/images.ts`) and Task 12 (`services/pdf/render.ts`)

**No fallback needed. Proceed as originally designed:**

- Task 9 (`services/pdf/images.ts`): convert source photos to 4-channel CMYK JPEG via
  `sharp(...).toColourspace("cmyk").jpeg(...)` and pass the resulting buffer straight to
  `doc.embedJpg(...)`. No RGB fallback path is required for images.
- Task 12 (`services/pdf/render.ts`): continue using `pdf-lib`'s `cmyk(c, m, y, k)` colour
  helper for all vector fills, strokes, and text — confirmed to emit `k`/`K` content-stream
  operators, not `rg`/`RG`.
- The phase-wide constraint "nothing in generated output may be `/DeviceRGB`" is achievable
  with the currently chosen tool chain (`pdf-lib` + `sharp`); no additional library or paid
  service is needed.
- Known limitation to carry forward (not because of this spike's result, but as a general
  note for QA): the "RGB fallback with a documented limitation" path described in the design
  doc's Task 9 contingency is **not needed** and should not be implemented — doing so would
  add unused complexity now that ACCEPTED is confirmed with byte-level evidence.
- Residual risk to flag for later, real-photo testing (not blocking, since the question this
  spike was asked to answer is answered): this spike used a synthetic single-colour JPEG.
  Real customer photos will exercise more of the JPEG encoder's chroma subsampling and
  ICC-profile handling; Task 9 should still sanity-check `/ColorSpace /DeviceCMYK` (e.g. via
  the same byte-level check used here, or an Acrobat separations check if available on
  whatever machine runs that task) on at least one real photo, not just trust that this
  synthetic case generalizes.
