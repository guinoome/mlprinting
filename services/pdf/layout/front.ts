import type { Cmyk, DrawInstruction } from "../types";
import type { PageSpec } from "../page-specs";
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

/** The faces a layout may ask for. Mirrors DrawInstruction's `font` field. */
type LayoutFont = Extract<DrawInstruction, { kind: "text" }>["font"];

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
    font: LayoutFont,
    color: Cmyk,
    field: string,
  ) {
    const available = cursorY - safe.y;
    const fit = fitsInBox(
      text,
      { width: safe.width, height: available },
      size,
      LINE_HEIGHT,
      measure,
    );
    if (!fit.fits) {
      overflows.push({
        field,
        requiredHeight: fit.requiredHeight,
        availableHeight: available,
      });
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
    centred(
      input.hostNames.join("  ·  "),
      13,
      "bodyRegular",
      colours.foreground,
      "hosts",
    );
  }

  centred(input.title, 30, "headingRegular", colours.foreground, "title");
  if (input.subtitle) {
    centred(input.subtitle, 13, "bodyItalic", colours.foreground, "subtitle");
  }

  const when = [input.dateLine, input.timeLine].filter(Boolean).join("  ·  ");
  if (when) centred(when, 12, "bodyBold", colours.accent, "date");

  if (input.invitationMessage) {
    centred(
      input.invitationMessage,
      11,
      "bodyRegular",
      colours.foreground,
      "invitationMessage",
    );
  }

  if (input.venueLines.length > 0 && !hidden.has("venues")) {
    for (const line of input.venueLines) {
      centred(line, 11, "bodyRegular", colours.foreground, "venues");
    }
  }

  return { instructions, overflows };
}
