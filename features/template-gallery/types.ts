/**
 * The virtual invitation gallery's data model.
 *
 * Deliberately separate from `features/template-marketplace`, which is backed by
 * Prisma and serves the live shop. This is a scaffold over mock data: it can
 * change shape freely while the gallery UX is being settled, without a
 * migration or a risk to the catalogue customers are already browsing.
 */

export const CATEGORIES = [
  "birthday",
  "wedding",
  "save-the-date",
  "baby-shower",
  "bridal-shower",
  "bar-bat-mitzvah",
  "graduation",
  "grand-opening",
  "retirement",
  "happy-hour",
] as const;

export const STYLES = [
  "watercolor",
  "minimalist",
  "illustrated",
  "elegant",
  "playful",
  "neon",
  "floral",
  "calligraphy",
  "photographic",
] as const;

export const ORIENTATIONS = ["portrait", "square"] as const;

/** Filterable colour buckets. A template's palette maps onto one or more. */
export const COLORS = [
  "pink",
  "blue",
  "cream",
  "gold",
  "green",
  "black",
  "neutral",
  "purple",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Style = (typeof STYLES)[number];
export type Orientation = (typeof ORIENTATIONS)[number];
export type ColorName = (typeof COLORS)[number];

export interface Template {
  id: string;
  title: string;
  category: Category;
  style: Style;
  orientation: Orientation;
  /** Gates the premium and animated designs. */
  isPro: boolean;
  isAnimated: boolean;
  thumbnailUrl: string;
  /** Hex codes, most dominant first. Drives the swatch row and colour filter. */
  colorPalette: string[];
  colors: ColorName[];
}

/**
 * The text hierarchy every template renders through.
 *
 * One shape for all of them, so a customer can swap design without the content
 * re-flowing into a different structure — the reason a gallery can promise
 * "change the look, keep your words".
 */
export interface InvitationContent {
  /** Small line above the headline, e.g. "JOIN US FOR". */
  eyebrow: string;
  /** The event name or the couple's names. The largest thing on the card. */
  headline: string;
  /** Date and time. */
  subheadline: string;
  /** Venue and address. */
  body: string;
  /** RSVP instruction or host contact. */
  footer: string;
}

/** Human labels. Slugs are for URLs and filters; these are for people. */
export const CATEGORY_LABELS: Record<Category, string> = {
  birthday: "Birthday",
  wedding: "Wedding",
  "save-the-date": "Save the Date",
  "baby-shower": "Baby Shower",
  "bridal-shower": "Bridal Shower",
  "bar-bat-mitzvah": "Bar / Bat Mitzvah",
  graduation: "Graduation",
  "grand-opening": "Grand Opening",
  retirement: "Retirement",
  "happy-hour": "Happy Hour",
};

export const STYLE_LABELS: Record<Style, string> = {
  watercolor: "Watercolor",
  minimalist: "Minimalist",
  illustrated: "Illustrated",
  elegant: "Elegant",
  playful: "Playful",
  neon: "Neon",
  floral: "Floral",
  calligraphy: "Calligraphy",
  photographic: "Photographic",
};

export interface GalleryFilters {
  query: string;
  categories: Category[];
  styles: Style[];
  colors: ColorName[];
  orientations: Orientation[];
}

export const EMPTY_FILTERS: GalleryFilters = {
  query: "",
  categories: [],
  styles: [],
  colors: [],
  orientations: [],
};

/** True when nothing is narrowing the grid — used to label the "All filters" control. */
export function activeFilterCount(f: GalleryFilters): number {
  return (
    f.categories.length +
    f.styles.length +
    f.colors.length +
    f.orientations.length
  );
}

/**
 * Search matches the title, the category and the style, because a person typing
 * "neon birthday" is describing a design, not recalling its name.
 */
export function matchesFilters(t: Template, f: GalleryFilters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const haystack =
      `${t.title} ${CATEGORY_LABELS[t.category]} ${STYLE_LABELS[t.style]}`.toLowerCase();
    if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  if (f.categories.length && !f.categories.includes(t.category)) return false;
  if (f.styles.length && !f.styles.includes(t.style)) return false;
  if (f.orientations.length && !f.orientations.includes(t.orientation)) {
    return false;
  }
  if (f.colors.length && !f.colors.some((c) => t.colors.includes(c))) {
    return false;
  }
  return true;
}
