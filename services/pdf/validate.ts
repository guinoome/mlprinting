import type { PageSpec } from "./page-specs";
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

/** Effective DPI of `pixels` spread across `points`. */
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
        message:
          "One photo's dimensions are unknown, so its print quality cannot be checked. Re-upload it.",
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
    warnings.push({
      code: "no-cover",
      message: "No cover photo — the front will be text only.",
    });
  }

  if (input.backIsEmpty) {
    warnings.push({
      code: "empty-back",
      message:
        "Nothing to print on the back, so this will be a single-sided card.",
    });
  }

  return { blocking, warnings, canGenerate: blocking.length === 0 };
}
