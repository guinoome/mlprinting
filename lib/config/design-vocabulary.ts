/**
 * The approved design system for invitations — Ph3.md §6.
 *
 * "Customization must remain within the approved design system." This file is
 * what makes that sentence enforceable rather than aspirational: it is the
 * closed set of choices a customer may make, and `InvitationPersonalization`
 * stores slugs from here and nothing else.
 *
 * Why not a colour picker and a font dropdown:
 *
 *   1. ML Printing's name goes on the printed result. A free colour picker
 *      produces invitations the shop would not put its name to, and there is no
 *      review step in the MVP to catch them.
 *   2. Print is not screen. An arbitrary RGB has no reliable ink equivalent;
 *      these palettes are chosen to survive the trip to paper. A hex column
 *      would hand Ph6's PDF generator colours it cannot honour.
 *   3. The same dataset renders twice (V1 §7). A choice has to mean something to
 *      both the website and the press sheet, which a raw value does not.
 *
 * Each entry carries its own preview swatch values. Those are for rendering the
 * *chooser* — the invitation record never stores them, only the slug.
 *
 * Adding a choice is an entry here. Nothing else in the app changes.
 */

export interface DesignOption {
  slug: string;
  name: string;
  description: string;
}

export interface ColorThemeOption extends DesignOption {
  /** Swatch preview only — the record stores the slug. */
  swatch: { background: string; foreground: string; accent: string };
}

/** Ph3.md §6 — Color Theme. */
export const COLOR_THEMES: ColorThemeOption[] = [
  {
    slug: "classic-ivory",
    name: "Classic Ivory",
    description:
      "Warm ivory with gold. The safest choice, and the most formal.",
    swatch: { background: "#f5efe8", foreground: "#3f3a35", accent: "#c9a227" },
  },
  {
    slug: "blush-rose",
    name: "Blush Rose",
    description: "Soft pink with muted rose. Reads gentle and romantic.",
    swatch: { background: "#f7eef0", foreground: "#4a3a3f", accent: "#c98c9c" },
  },
  {
    slug: "sage-garden",
    name: "Sage Garden",
    description: "Muted green with stone. Suits gardens and daytime events.",
    swatch: { background: "#eef2f0", foreground: "#2f3a37", accent: "#7fa295" },
  },
  {
    slug: "midnight-navy",
    name: "Midnight Navy",
    description: "Deep navy with gold. Built for evening receptions.",
    swatch: { background: "#1f2937", foreground: "#f5efe8", accent: "#c9a227" },
  },
  {
    slug: "burgundy-velvet",
    name: "Burgundy Velvet",
    description: "Deep red with cream. Traditional and warm.",
    swatch: { background: "#f8f4f2", foreground: "#4a2328", accent: "#8c2f39" },
  },
  {
    slug: "coral-fiesta",
    name: "Coral Fiesta",
    description: "Bright coral and yellow. Loud on purpose.",
    swatch: { background: "#fff7ed", foreground: "#43302b", accent: "#e2725b" },
  },
  {
    slug: "monochrome",
    name: "Monochrome",
    description: "Black on white. Nothing to distract from the words.",
    swatch: { background: "#ffffff", foreground: "#1a1a1a", accent: "#666666" },
  },
];

export interface TypographyOption extends DesignOption {
  /** CSS font stacks for the preview. Not stored on the invitation. */
  preview: { heading: string; body: string };
}

/**
 * Ph3.md §6 — Typography.
 *
 * Pairings, not a font list. Choosing a heading font and a body font
 * independently is a design skill, and Ph3.md's UI Requirements are explicit
 * that this should feel like "a guided interview rather than complex design
 * software". Each pairing is one decision that cannot go wrong.
 */
export const TYPOGRAPHY_SETS: TypographyOption[] = [
  {
    slug: "classic-serif",
    name: "Classic Serif",
    description: "Traditional and formal. The default for weddings.",
    preview: {
      heading: "Georgia, 'Times New Roman', serif",
      body: "Georgia, 'Times New Roman', serif",
    },
  },
  {
    slug: "modern-sans",
    name: "Modern Sans",
    description: "Clean and contemporary. Reads well at small sizes.",
    preview: {
      heading: "'Helvetica Neue', Arial, sans-serif",
      body: "'Helvetica Neue', Arial, sans-serif",
    },
  },
  {
    slug: "elegant-script",
    name: "Elegant Script",
    description:
      "A script heading over a plain body. Formal without being fussy.",
    preview: {
      heading: "'Brush Script MT', 'Segoe Script', cursive",
      body: "Georgia, serif",
    },
  },
  {
    slug: "editorial-mix",
    name: "Editorial",
    description:
      "Serif headings, sans body. Magazine-like and highly readable.",
    preview: {
      heading: "Georgia, serif",
      body: "'Helvetica Neue', Arial, sans-serif",
    },
  },
];

/** Ph3.md §6 — Background Style. */
export const BACKGROUND_STYLES: DesignOption[] = [
  {
    slug: "plain",
    name: "Plain",
    description: "A flat background. Cheapest to print.",
  },
  {
    slug: "subtle-texture",
    name: "Subtle Texture",
    description: "A faint paper grain.",
  },
  {
    slug: "soft-gradient",
    name: "Soft Gradient",
    description: "A gentle wash of colour.",
  },
  {
    slug: "bordered",
    name: "Bordered",
    description: "A ruled border framing the page.",
  },
];

/** Ph3.md §6 — Decorative Elements. */
export const DECORATIVE_STYLES: DesignOption[] = [
  {
    slug: "none",
    name: "None",
    description: "No ornament. Let the words carry it.",
  },
  {
    slug: "botanical",
    name: "Botanical",
    description: "Leaves and stems at the corners.",
  },
  {
    slug: "floral",
    name: "Floral",
    description: "Flowers framing the heading.",
  },
  {
    slug: "geometric",
    name: "Geometric",
    description: "Fine lines and simple shapes.",
  },
  { slug: "lace", name: "Lace", description: "A lace motif along the edges." },
];

/**
 * Ph3.md §6 — Section Visibility.
 *
 * The sections a customer may switch off. Not every section is here: the event
 * heading has no toggle because an invitation without it is not an invitation.
 * A toggle that produces a broken result is not a choice, it is a trap.
 */
export interface SectionOption extends DesignOption {
  /** The step that fills this section, for a "nothing to show yet" hint. */
  step: string;
}

export const TOGGLEABLE_SECTIONS: SectionOption[] = [
  {
    slug: "welcome",
    name: "Welcome message",
    description: "An opening line above the details.",
    step: "content",
  },
  {
    slug: "hosts",
    name: "Hosts",
    description: "The celebrants and their photos.",
    step: "hosts",
  },
  {
    slug: "parents",
    name: "Parents",
    description: "Parents of the celebrants.",
    step: "content",
  },
  {
    slug: "sponsors",
    name: "Sponsors",
    description: "Principal sponsors.",
    step: "content",
  },
  {
    slug: "program",
    name: "Programme",
    description: "The order of events.",
    step: "content",
  },
  {
    slug: "venues",
    name: "Venues",
    description: "Where it happens, with maps.",
    step: "venue",
  },
  {
    slug: "gifts",
    name: "Gift preference",
    description: "How guests should handle gifts.",
    step: "content",
  },
  {
    slug: "dress-code",
    name: "Dress code",
    description: "What to wear.",
    step: "event",
  },
  {
    slug: "rsvp",
    name: "RSVP",
    description: "The deadline and how to reply.",
    step: "event",
  },
  {
    slug: "gallery",
    name: "Photo gallery",
    description: "Couple and family photos.",
    step: "media",
  },
  {
    slug: "notes",
    name: "Special notes",
    description: "Anything else guests need.",
    step: "content",
  },
];

// --- Lookups. Every write validates through these. ---

const COLOR_SLUGS = new Set(COLOR_THEMES.map((o) => o.slug));
const TYPOGRAPHY_SLUGS = new Set(TYPOGRAPHY_SETS.map((o) => o.slug));
const BACKGROUND_SLUGS = new Set(BACKGROUND_STYLES.map((o) => o.slug));
const DECORATIVE_SLUGS = new Set(DECORATIVE_STYLES.map((o) => o.slug));
const SECTION_SLUGS = new Set(TOGGLEABLE_SECTIONS.map((o) => o.slug));

export const isColorTheme = (slug: string): boolean => COLOR_SLUGS.has(slug);
export const isTypography = (slug: string): boolean =>
  TYPOGRAPHY_SLUGS.has(slug);
export const isBackgroundStyle = (slug: string): boolean =>
  BACKGROUND_SLUGS.has(slug);
export const isDecorativeStyle = (slug: string): boolean =>
  DECORATIVE_SLUGS.has(slug);
export const isToggleableSection = (slug: string): boolean =>
  SECTION_SLUGS.has(slug);

/** Defaults, matching the column defaults in schema.prisma. */
export const DESIGN_DEFAULTS = {
  colorTheme: "classic-ivory",
  typography: "classic-serif",
  backgroundStyle: "plain",
  decorativeStyle: "none",
} as const;

export function colorTheme(slug: string): ColorThemeOption {
  return COLOR_THEMES.find((o) => o.slug === slug) ?? COLOR_THEMES[0]!;
}

export function typography(slug: string): TypographyOption {
  return TYPOGRAPHY_SETS.find((o) => o.slug === slug) ?? TYPOGRAPHY_SETS[0]!;
}
