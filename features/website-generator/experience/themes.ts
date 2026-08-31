import type { PreviewStyle } from "@/lib/invitation/preview-model";
import type { VisualThemeId } from "./types";

/**
 * Platform-controlled visual identities for the first three WP20 proofs.
 * Event content stays in PreviewModel; a theme only selects design vocabulary.
 */
export const EXPERIENCE_THEMES: Record<
  Exclude<VisualThemeId, "inherit">,
  PreviewStyle
> = {
  "capiz-luminous": {
    background: "#f7f0dc",
    foreground: "#27372f",
    accent: "#b88a38",
    headingFont:
      "Didot, 'Bodoni MT', 'Hoefler Text', Georgia, 'Times New Roman', serif",
    bodyFont: "'Gill Sans', 'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient",
    decorativeStyle: "filigree",
  },
  "neon-nightlife": {
    background: "#070611",
    foreground: "#fff7ff",
    accent: "#ff3fbf",
    headingFont: "'Arial Black', 'Segoe UI Black', Impact, sans-serif",
    bodyFont: "Inter, 'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient",
    decorativeStyle: "neon-grid",
  },
  "memorial-quiet": {
    background: "#f3f1ec",
    foreground: "#30322f",
    accent: "#6f756b",
    headingFont:
      "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered",
    decorativeStyle: "none",
  },
};

export function styleForExperience(
  style: PreviewStyle,
  themeId: VisualThemeId,
): PreviewStyle {
  return themeId === "inherit" ? style : EXPERIENCE_THEMES[themeId];
}
