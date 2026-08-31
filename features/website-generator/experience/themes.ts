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
  "atelier-ivory": {
    background: "#f4efe5", foreground: "#171714", accent: "#9a6f32",
    headingFont: "Didot, 'Bodoni MT', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "filigree",
  },
  "botanical-romance": {
    background: "#f3e9e4", foreground: "#29362d", accent: "#9b5f68",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "floral",
  },
  "midnight-metallic": {
    background: "#090d18", foreground: "#fbf3df", accent: "#c69b4a",
    headingFont: "Didot, 'Bodoni MT', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "filigree",
  },
  "coastal-air": {
    background: "#e9ede7", foreground: "#263c3d", accent: "#b47e55",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "none",
  },
  "filipino-craft": {
    background: "#f2ead7", foreground: "#312b20", accent: "#a1452e",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "filigree",
  },
  "celebration-pop": {
    background: "#fff0d9", foreground: "#262136", accent: "#ef5b54",
    headingFont: "'Arial Black', Impact, sans-serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "confetti",
  },
  "memory-film": {
    background: "#e6dccb", foreground: "#282520", accent: "#8c5038",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Courier New', monospace",
    backgroundStyle: "bordered", decorativeStyle: "none",
  },
  "storybook-play": {
    background: "#e8f1ef", foreground: "#273e45", accent: "#d87a78",
    headingFont: "Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "confetti",
  },
  "cinematic-frame": {
    background: "#0b1017", foreground: "#f4eee4", accent: "#b98555",
    headingFont: "Didot, 'Bodoni MT', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "none",
  },
  "quiet-ceremony": {
    background: "#f0eee7", foreground: "#343933", accent: "#7b826f",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "none",
  },
  "corporate-precision": {
    background: "#f0f1ef", foreground: "#101820", accent: "#b67b38",
    headingFont: "'Arial Narrow', 'Segoe UI', sans-serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "none",
  },
  "digital-light": {
    background: "#080914", foreground: "#f8f8ff", accent: "#8e7cff",
    headingFont: "'Arial Black', 'Segoe UI Black', sans-serif", bodyFont: "Inter, 'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "neon-grid",
  },
  "festival-pulse": {
    background: "#181026", foreground: "#fff7df", accent: "#ff5a36",
    headingFont: "'Arial Black', Impact, sans-serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "confetti",
  },
  "romantic-seal": {
    background: "#efe4df", foreground: "#35252a", accent: "#a44654",
    headingFont: "Didot, 'Bodoni MT', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "bordered", decorativeStyle: "filigree",
  },
  "guided-story": {
    background: "#efece4", foreground: "#202c2b", accent: "#9b7043",
    headingFont: "'Iowan Old Style', Georgia, serif", bodyFont: "'Segoe UI', system-ui, sans-serif",
    backgroundStyle: "soft-gradient", decorativeStyle: "none",
  },
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
