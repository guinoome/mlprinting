import "server-only";

/**
 * PDF engine — the public surface. Ph6.md §15 keeps features depending on
 * services and never the reverse; nothing outside this folder imports
 * services/pdf/* by its internal path.
 */

export type { Cmyk, Box, DrawInstruction, PdfSizeSlug } from "./types";
export type { PageSpec } from "./page-specs";
export { PAGE_SPECS, pageSpecFor, MM_TO_PT, PT_PER_INCH } from "./page-specs";
export type { PrintColours } from "./colour";
export { printColours } from "./colour";
export type { MeasureFn, FitResult } from "./text";
export { wrapText, fitsInBox } from "./text";
export type { PrintFontSet, PrintFontFamily } from "./fonts";
export { fontFilesFor, loadFontBytes } from "./fonts";
export type { PreparedImage } from "./images";
export { prepareImage, requiredPixelsFor, PRINT_DPI } from "./images";
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
export type {
  GenerationRow,
  PrintInvitation,
  CreateGenerationInput,
} from "./repository";
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
