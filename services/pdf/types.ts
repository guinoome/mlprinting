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
      font:
        | "headingRegular"
        | "headingBold"
        | "bodyRegular"
        | "bodyBold"
        | "bodyItalic";
      align: "left" | "center";
      /** Present for centred text: the width it is centred within. */
      maxWidth?: number;
    }
  | { kind: "image"; assetId: string; box: Box }
  | {
      kind: "line";
      from: { x: number; y: number };
      to: { x: number; y: number };
      color: Cmyk;
      thickness: number;
    };
