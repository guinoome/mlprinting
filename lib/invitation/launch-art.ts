export interface LaunchArtwork {
  /** Portrait/square campaign poster used by the marketplace card. */
  catalogueSrc: string;
  /** Wide, text-free composition used behind live invitation copy. */
  heroSrc: string;
  alt: string;
}

/**
 * Production artwork for designs that have passed the public release gate.
 *
 * Database cover art remains the editable print/design source. This map owns
 * the cinematic shop-window image used to sell the interactive experience, so
 * a seed placeholder cannot quietly replace a finished launch campaign.
 */
export const LAUNCH_ARTWORK = {
  "capiz-window": {
    catalogueSrc: "/experiences/capiz-window-catalogue.png",
    heroSrc: "/experiences/capiz-window-hero.png",
    alt: "Filipino wedding couple framed by a luminous capiz installation",
  },
  "neon-eighteen": {
    catalogueSrc: "/experiences/neon-eighteen-catalogue.png",
    heroSrc: "/experiences/neon-eighteen-hero.png",
    alt: "Debutante on a violet and cyan stage shaped by the number eighteen",
  },
  "fiesta-banderitas": {
    catalogueSrc: "/experiences/fiesta-banderitas-catalogue.png",
    heroSrc: "/experiences/fiesta-banderitas-hero.png",
    alt: "Filipina festival host walking beneath colourful Cebuano banderitas",
  },
  "product-launch": {
    catalogueSrc: "/experiences/product-launch-catalogue.png",
    heroSrc: "/experiences/product-launch-catalogue.png",
    alt: "Pearlescent product reveal on an indigo keynote stage",
  },
} as const satisfies Record<string, LaunchArtwork>;

export type LaunchArtworkSlug = keyof typeof LAUNCH_ARTWORK;

export function launchArtworkForSlug(
  slug: string | null | undefined,
): LaunchArtwork | null {
  if (!slug || !(slug in LAUNCH_ARTWORK)) return null;
  return LAUNCH_ARTWORK[slug as LaunchArtworkSlug];
}
