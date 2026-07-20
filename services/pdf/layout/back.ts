import type { DrawInstruction } from "../types";
import type { PageSpec } from "../page-specs";
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
      const fit = fitsInBox(
        line,
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
  if (!hidden.has("sponsors")) {
    block("Principal Sponsors", input.sponsors, 10, "sponsors");
  }

  if (!hidden.has("program")) {
    block(
      "Programme",
      input.programme.map((item) =>
        item.time ? `${item.time} — ${item.title}` : item.title,
      ),
      10,
      "program",
    );
  }

  if (!hidden.has("dress-code") && input.dressCode) {
    block("Dress Code", [input.dressCode], 10, "dress-code");
  }
  if (!hidden.has("gifts") && input.giftsPreference) {
    block("Gifts", [input.giftsPreference], 10, "gifts");
  }
  if (!hidden.has("notes") && input.specialNotes) {
    block("Notes", [input.specialNotes], 10, "notes");
  }
  if (!hidden.has("rsvp") && input.rsvpLine) {
    block(null, [input.rsvpLine], 10, "rsvp");
  }

  return { instructions, overflows, isEmpty: !drewSomething };
}
