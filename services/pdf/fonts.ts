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
 *
 * Every file here is a STATIC cut, never a variable font. pdf-lib embeds a
 * variable font's default instance, so a "bold" mapped to a variable file
 * would print at regular weight — invisible on screen, obvious on paper,
 * after the press run. Crimson Text, Lato, Spectral and Great Vibes were
 * chosen over Lora, Inter and Playfair Display for exactly this reason:
 * google/fonts now ships those three as variable-only.
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

export type PrintFontFamily = keyof PrintFontSet;

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
