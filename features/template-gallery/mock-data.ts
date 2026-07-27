import {
  CATEGORY_LABELS,
  STYLE_LABELS,
  type Category,
  type ColorName,
  type Style,
  type Template,
} from "./types";

/**
 * Mock catalogue for the gallery scaffold.
 *
 * Generated from a table of design ideas rather than hand-written 200 times, so
 * there is enough volume for "Show More", the result counter and the filters to
 * behave like the real thing instead of demoing against six cards.
 *
 * Thumbnails come from the platform's own cover renderer
 * (app/api/placeholder/…), so the grid shows actual designs. That keeps the
 * scaffold honest: the layout is judged against real artwork, not grey boxes
 * that flatter it.
 */

/** Gallery style -> the cover renderer's composition. */
const ART_STYLE: Record<Style, string> = {
  watercolor: "floral",
  minimalist: "minimal",
  illustrated: "kids",
  elegant: "gold-foil",
  playful: "kids",
  neon: "luxury",
  floral: "floral",
  calligraphy: "classic",
  photographic: "portrait",
};

/** Gallery category -> the renderer's palette family. */
const ART_FAMILY: Record<Category, string> = {
  birthday: "Birthday",
  wedding: "Wedding",
  "save-the-date": "Engagement",
  "baby-shower": "Baby Shower",
  "bridal-shower": "Baby Shower",
  "bar-bat-mitzvah": "Religious",
  graduation: "Graduation",
  "grand-opening": "Corporate",
  retirement: "Corporate",
  "happy-hour": "Community",
};

const PALETTES: Record<ColorName, string[]> = {
  pink: ["#f7d9dd", "#c0868c", "#5a3f42"],
  blue: ["#dce9eb", "#6f97a1", "#33454b"],
  cream: ["#faf6ef", "#d8c79a", "#4a4038"],
  gold: ["#f4e6bd", "#c9a227", "#4a4230"],
  green: ["#e3ece0", "#7d977f", "#3a453c"],
  black: ["#2b2f38", "#6c7789", "#f3ecdd"],
  neutral: ["#eae4d9", "#a39a7c", "#4a4438"],
  purple: ["#e8def4", "#9a7bc0", "#453852"],
};

interface Idea {
  /** The distinctive half of the title, e.g. "Pink Watercolor". */
  motif: string;
  style: Style;
  color: ColorName;
}

/** Design ideas, crossed with categories below to build the catalogue. */
const IDEAS: Idea[] = [
  { motif: "Pink Watercolor", style: "watercolor", color: "pink" },
  { motif: "Blush Peony", style: "floral", color: "pink" },
  { motif: "Sage Eucalyptus", style: "floral", color: "green" },
  { motif: "Gold Script", style: "calligraphy", color: "gold" },
  { motif: "Midnight Foil", style: "elegant", color: "black" },
  { motif: "Quiet Type", style: "minimalist", color: "neutral" },
  { motif: "Paper Confetti", style: "playful", color: "pink" },
  { motif: "Neon Glow", style: "neon", color: "purple" },
  { motif: "Ivory Linen", style: "minimalist", color: "cream" },
  { motif: "Hand Drawn", style: "illustrated", color: "blue" },
  { motif: "Photo Frame", style: "photographic", color: "neutral" },
  { motif: "Dusty Blue", style: "watercolor", color: "blue" },
  { motif: "Champagne", style: "elegant", color: "gold" },
  { motif: "Botanical Ink", style: "floral", color: "green" },
  { motif: "Bold Serif", style: "minimalist", color: "black" },
  { motif: "Balloon Arch", style: "playful", color: "purple" },
  { motif: "Lavender Wash", style: "watercolor", color: "purple" },
  { motif: "Copper Line", style: "calligraphy", color: "gold" },
];

/** Which ideas suit which occasion. Keeps neon off a christening. */
const CATEGORY_IDEAS: Record<Category, string[]> = {
  birthday: ["Paper Confetti", "Neon Glow", "Balloon Arch", "Photo Frame", "Bold Serif", "Lavender Wash"],
  wedding: ["Pink Watercolor", "Blush Peony", "Sage Eucalyptus", "Gold Script", "Midnight Foil", "Ivory Linen", "Photo Frame", "Champagne"],
  "save-the-date": ["Gold Script", "Photo Frame", "Quiet Type", "Dusty Blue", "Copper Line", "Bold Serif"],
  "baby-shower": ["Pink Watercolor", "Hand Drawn", "Lavender Wash", "Sage Eucalyptus", "Paper Confetti"],
  "bridal-shower": ["Blush Peony", "Pink Watercolor", "Champagne", "Botanical Ink", "Gold Script"],
  "bar-bat-mitzvah": ["Gold Script", "Midnight Foil", "Quiet Type", "Bold Serif", "Copper Line"],
  graduation: ["Bold Serif", "Midnight Foil", "Photo Frame", "Quiet Type", "Copper Line"],
  "grand-opening": ["Neon Glow", "Bold Serif", "Midnight Foil", "Champagne"],
  retirement: ["Quiet Type", "Botanical Ink", "Champagne", "Ivory Linen"],
  "happy-hour": ["Neon Glow", "Bold Serif", "Paper Confetti", "Balloon Arch"],
};

const ideaByMotif = new Map(IDEAS.map((i) => [i.motif, i]));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Stable pseudo-randomness from the id, so a template's Pro flag and use of
 * animation do not change between renders — a card that gains a Pro badge on
 * refresh looks broken.
 */
function seeded(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function build(): Template[] {
  const out: Template[] = [];

  for (const category of Object.keys(CATEGORY_IDEAS) as Category[]) {
    for (const motif of CATEGORY_IDEAS[category]) {
      const idea = ideaByMotif.get(motif)!;
      // "Pink Watercolor Wedding Virtual Invitation" — the phrasing the brief
      // asks for, and what someone actually searches.
      const title = `${motif} ${CATEGORY_LABELS[category]} Virtual Invitation`;
      const id = slugify(`${motif}-${category}`);
      const r = seeded(id);

      // Portrait dominates: these are made to be shared on a phone.
      const orientation = r > 0.78 ? "square" : "portrait";
      const isPro = r > 0.62;
      // Animation is a premium feature, so it only appears on Pro designs.
      const isAnimated = isPro && r > 0.74;

      out.push({
        id,
        title,
        category,
        style: idea.style,
        orientation,
        isPro,
        isAnimated,
        colorPalette: PALETTES[idea.color],
        colors: [idea.color],
        thumbnailUrl:
          `/api/placeholder/cover/${id}` +
          `?label=${encodeURIComponent(motif)}` +
          `&caption=${encodeURIComponent(ART_FAMILY[category])}` +
          `&style=${ART_STYLE[idea.style]}`,
      });
    }
  }

  return out;
}

export const MOCK_TEMPLATES: Template[] = build();

/** How many the grid reveals at a time. */
export const PAGE_SIZE = 12;

/**
 * Sub-categories for the "Explore more" row.
 *
 * Real internal links to filtered views rather than dead SEO text: each one is
 * a query this gallery can actually answer.
 */
export const EXPLORE_LINKS: { label: string; query: string }[] = [
  { label: "Virtual Bar Mitzvah", query: "category=bar-bat-mitzvah" },
  { label: "Virtual Wedding", query: "category=wedding" },
  { label: "Virtual Birthday Party", query: "category=birthday" },
  { label: "Save the Date", query: "category=save-the-date" },
  { label: "Baby Shower", query: "category=baby-shower" },
  { label: "Bridal Shower", query: "category=bridal-shower" },
  { label: "Graduation", query: "category=graduation" },
  { label: "Grand Opening", query: "category=grand-opening" },
  { label: "Retirement Party", query: "category=retirement" },
  { label: "Happy Hour", query: "category=happy-hour" },
  { label: "Watercolor Invitations", query: "style=watercolor" },
  { label: "Minimalist Invitations", query: "style=minimalist" },
  { label: "Neon Invitations", query: "style=neon" },
  { label: "Calligraphy Invitations", query: "style=calligraphy" },
];

export { STYLE_LABELS };
