import "server-only";

import { PDFDocument, cmyk, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { AssetRow } from "@/services/media";
import type { Cmyk, DrawInstruction } from "./types";
import type { PageSpec } from "./page-specs";
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
 * Throws on an unmapped slug. Validation reports that as a blocking issue
 * first, so reaching this throw means a caller skipped validation — which
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
function drawCropMarks(
  page: ReturnType<PDFDocument["addPage"]>,
  spec: PageSpec,
) {
  const b = spec.bleed;
  const len = b * 0.8;
  const black = cmyk(0, 0, 0, 1);
  const marks: [number, number, number, number][] = [
    [0, b, len, b],
    [b, 0, b, len],
    [spec.mediaWidth - len, b, spec.mediaWidth, b],
    [spec.mediaWidth - b, 0, spec.mediaWidth - b, len],
    [0, spec.mediaHeight - b, len, spec.mediaHeight - b],
    [b, spec.mediaHeight - len, b, spec.mediaHeight],
    [
      spec.mediaWidth - len,
      spec.mediaHeight - b,
      spec.mediaWidth,
      spec.mediaHeight - b,
    ],
    [
      spec.mediaWidth - b,
      spec.mediaHeight - len,
      spec.mediaWidth - b,
      spec.mediaHeight,
    ],
  ];

  for (const [x1, y1, x2, y2] of marks) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      color: black,
      thickness: 0.25,
    });
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
        page.drawLine({
          start: item.from,
          end: item.to,
          color: toColor(item.color),
          thickness: item.thickness,
        });
      } else if (item.kind === "text") {
        const font = fonts[item.font];
        const width = font.widthOfTextAtSize(item.text, item.size);
        const x = item.align === "center" ? item.x - width / 2 : item.x;
        page.drawText(item.text, {
          x,
          y: item.y,
          size: item.size,
          font,
          color: toColor(item.color),
        });
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
