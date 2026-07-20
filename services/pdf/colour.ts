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
