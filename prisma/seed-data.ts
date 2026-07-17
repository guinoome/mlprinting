/**
 * Catalog seed content — Ph2.md §1.
 *
 * Plain data, no Prisma import, so it can be asserted against in unit tests
 * without a database. prisma/seed.ts turns it into rows.
 *
 * The copy is placeholder content written to be plausible for a Cebu print
 * shop, not final marketing text. It exists so the marketplace can be built and
 * reviewed before ML Printing supplies real templates.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

/**
 * The event types from Ph2.md §1, plus "Custom".
 *
 * Rows, not code — adding "Reunion" later is an INSERT. This array only seeds
 * the initial set; nothing reads it at runtime.
 */
export const CATEGORIES: SeedCategory[] = [
  {
    slug: "wedding",
    name: "Wedding",
    description: "Ceremonies and receptions.",
    sortOrder: 10,
  },
  {
    slug: "birthday",
    name: "Birthday",
    description: "Every age, every style.",
    sortOrder: 20,
  },
  {
    slug: "christening",
    name: "Christening",
    description: "Baptisms and dedications.",
    sortOrder: 30,
  },
  {
    slug: "debut",
    name: "Debut",
    description: "The Filipino 18th birthday.",
    sortOrder: 40,
  },
  {
    slug: "anniversary",
    name: "Anniversary",
    description: "Milestones worth marking.",
    sortOrder: 50,
  },
  {
    slug: "graduation",
    name: "Graduation",
    description: "Commencements and recognitions.",
    sortOrder: 60,
  },
  {
    slug: "corporate",
    name: "Corporate",
    description: "Launches, galas, and company events.",
    sortOrder: 70,
  },
  {
    slug: "custom",
    name: "Custom",
    description: "Anything that does not fit a box.",
    sortOrder: 999,
  },
];

export interface SeedCollection {
  slug: string;
  name: string;
  description: string;
  /** Month-day window, e.g. "12-01". Null means always active. */
  activeFrom: string | null;
  activeTo: string | null;
}

/** Ph2.md §1 — Seasonal. The window is why collections exist at all. */
export const COLLECTIONS: SeedCollection[] = [
  {
    slug: "christmas",
    name: "Christmas",
    description: "Templates for the Philippine Christmas season.",
    activeFrom: "09-01",
    activeTo: "12-31",
  },
  {
    slug: "summer",
    name: "Summer",
    description: "Bright templates for the dry season.",
    activeFrom: "03-01",
    activeTo: "05-31",
  },
];

export interface SeedTemplate {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  designer: string;
  tags: string[];
  colors: string[];
  styles: string[];
  features: string[];
  orientation: "PORTRAIT" | "LANDSCAPE" | "SQUARE";
  tier: "FREE" | "PREMIUM";
  printCompatible: boolean;
  websiteCompatible: boolean;
  isFeatured: boolean;
  /** Days before seed time. Drives "New" and the newest sort. */
  publishedDaysAgo: number;
  /** Seeds the Most Popular sort so the ordering is observable. */
  useCount: number;
  collections?: string[];
}

/**
 * Seed templates.
 *
 * Sized and spread deliberately: more than one page at the default 12 per page
 * (so pagination is exercised), a mix of tiers, orientations, colours, styles,
 * and publication dates (so every filter and sort in §4/§5 returns a non-trivial
 * result), and two that are print-only or website-only (so §7's compatibility
 * flags are not uniformly true).
 */
export const TEMPLATES: SeedTemplate[] = [
  {
    slug: "ivory-lace",
    name: "Ivory Lace",
    category: "wedding",
    shortDescription: "Classic lace borders on warm ivory.",
    description:
      "A traditional wedding suite built around a fine lace border and a serif wordmark. Reads formal without tipping into fussy, and holds up in both a printed suite and a single-page website.",
    designer: "ML Printing Studio",
    tags: ["lace", "classic", "formal", "traditional"],
    colors: ["ivory", "gold"],
    styles: ["classic", "elegant"],
    features: ["rsvp", "gallery", "map", "timeline"],
    orientation: "PORTRAIT",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: true,
    publishedDaysAgo: 120,
    useCount: 184,
  },
  {
    slug: "blush-botanical",
    name: "Blush Botanical",
    category: "wedding",
    shortDescription: "Soft botanicals in blush and sage.",
    description:
      "Hand-drawn botanicals frame the page in blush and sage. The lightest of the wedding suites, and the most forgiving of long names and long guest lists.",
    designer: "ML Printing Studio",
    tags: ["botanical", "floral", "garden", "soft"],
    colors: ["blush", "sage"],
    styles: ["modern", "minimal"],
    features: ["rsvp", "gallery", "map"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: true,
    publishedDaysAgo: 14,
    useCount: 97,
  },
  {
    slug: "midnight-gold",
    name: "Midnight Gold",
    category: "wedding",
    shortDescription: "Deep navy with gold foil accents.",
    description:
      "Built for evening receptions. Navy ground with gold accents intended for foil stock — the print version is the point, and the website version follows it rather than the other way round.",
    designer: "Cebu Type Co.",
    tags: ["foil", "evening", "formal", "luxe"],
    colors: ["navy", "gold"],
    styles: ["elegant", "classic"],
    features: ["rsvp", "timeline"],
    orientation: "PORTRAIT",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 200,
    useCount: 143,
  },
  {
    slug: "coastal-linen",
    name: "Coastal Linen",
    category: "wedding",
    shortDescription: "Barefoot beach wedding, understated.",
    description:
      "A linen-textured layout for beach ceremonies, with generous margins and a wide landscape crop for panoramic photography.",
    designer: "Cebu Type Co.",
    tags: ["beach", "coastal", "relaxed", "summer"],
    colors: ["sand", "seafoam"],
    styles: ["minimal", "rustic"],
    features: ["rsvp", "gallery", "map"],
    orientation: "LANDSCAPE",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 45,
    useCount: 61,
    collections: ["summer"],
  },
  {
    slug: "confetti-pop",
    name: "Confetti Pop",
    category: "birthday",
    shortDescription: "Bright confetti for any age.",
    description:
      "Loud, cheerful, and deliberately unsubtle. Scales from a child's party to a fortieth without changing character.",
    designer: "ML Printing Studio",
    tags: ["confetti", "colourful", "party", "fun"],
    colors: ["coral", "yellow"],
    styles: ["playful", "modern"],
    features: ["rsvp", "gallery"],
    orientation: "SQUARE",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: true,
    publishedDaysAgo: 8,
    useCount: 122,
  },
  {
    slug: "first-year",
    name: "First Year",
    category: "birthday",
    shortDescription: "A first birthday, gently done.",
    description:
      "Built around one large photograph and a short message. Intended for first birthdays, where the picture is the invitation and the text is the caption.",
    designer: "Isla Studio",
    tags: ["baby", "first", "milestone", "photo"],
    colors: ["cream", "sky"],
    styles: ["minimal", "soft"],
    features: ["rsvp", "gallery"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 90,
    useCount: 74,
  },
  {
    slug: "neon-eighteen",
    name: "Neon Eighteen",
    category: "debut",
    shortDescription: "High-contrast neon for a modern debut.",
    description:
      "A debut suite with neon accents on near-black. Designed screen-first: the website version carries the design, and the printed piece is a deliberately restrained companion.",
    designer: "Isla Studio",
    tags: ["neon", "modern", "bold", "debut"],
    colors: ["magenta", "black"],
    styles: ["modern", "playful"],
    features: ["rsvp", "gallery", "timeline", "music"],
    orientation: "PORTRAIT",
    tier: "PREMIUM",
    printCompatible: false,
    websiteCompatible: true,
    isFeatured: true,
    publishedDaysAgo: 21,
    useCount: 88,
  },
  {
    slug: "eighteen-roses",
    name: "Eighteen Roses",
    category: "debut",
    shortDescription: "The traditional debut, done properly.",
    description:
      "Structured for the Filipino debut: room for the eighteen roses, eighteen candles, and eighteen treasures without the page collapsing into a list.",
    designer: "ML Printing Studio",
    tags: ["traditional", "roses", "candles", "debut"],
    colors: ["burgundy", "gold"],
    styles: ["classic", "elegant"],
    features: ["rsvp", "timeline", "gallery"],
    orientation: "PORTRAIT",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 160,
    useCount: 156,
  },
  {
    slug: "little-dove",
    name: "Little Dove",
    category: "christening",
    shortDescription: "Quiet, reverent, uncluttered.",
    description:
      "A christening suite with a single dove motif and generous white space. Deliberately plain — the occasion supplies the weight.",
    designer: "Isla Studio",
    tags: ["dove", "baptism", "quiet", "faith"],
    colors: ["ivory", "sky"],
    styles: ["minimal", "classic"],
    features: ["rsvp", "map"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 75,
    useCount: 52,
  },
  {
    slug: "sacred-olive",
    name: "Sacred Olive",
    category: "christening",
    shortDescription: "Olive branches and warm stone.",
    description:
      "Olive branch illustrations on a warm stone ground. Reads as a keepsake, and is the strongest of the christening suites in print.",
    designer: "Cebu Type Co.",
    tags: ["olive", "baptism", "keepsake", "botanical"],
    colors: ["olive", "stone"],
    styles: ["rustic", "classic"],
    features: ["rsvp", "gallery", "map"],
    orientation: "PORTRAIT",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: false,
    isFeatured: false,
    publishedDaysAgo: 300,
    useCount: 39,
  },
  {
    slug: "golden-jubilee",
    name: "Golden Jubilee",
    category: "anniversary",
    shortDescription: "Fifty years, stated plainly.",
    description:
      "A golden anniversary suite that resists the urge to decorate. A large numeral, a short line of text, and room for one photograph.",
    designer: "ML Printing Studio",
    tags: ["anniversary", "golden", "milestone", "fifty"],
    colors: ["gold", "ivory"],
    styles: ["classic", "elegant"],
    features: ["rsvp", "gallery", "timeline"],
    orientation: "LANDSCAPE",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 240,
    useCount: 67,
  },
  {
    slug: "paper-anniversary",
    name: "Paper Anniversary",
    category: "anniversary",
    shortDescription: "Understated, for the early years.",
    description:
      "Kraft-toned and typographic. Intended for first and second anniversaries, where a modest card suits the occasion better than a suite.",
    designer: "Cebu Type Co.",
    tags: ["kraft", "typographic", "modest", "anniversary"],
    colors: ["kraft", "charcoal"],
    styles: ["minimal", "rustic"],
    features: ["rsvp"],
    orientation: "SQUARE",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 30,
    useCount: 28,
  },
  {
    slug: "toga-and-tassel",
    name: "Toga and Tassel",
    category: "graduation",
    shortDescription: "Straightforward graduation announcement.",
    description:
      "A graduation announcement built around the photograph and the achievement. Navy and white, with room for the school seal.",
    designer: "Isla Studio",
    tags: ["graduation", "school", "achievement", "photo"],
    colors: ["navy", "white"],
    styles: ["classic", "modern"],
    features: ["gallery", "timeline"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 55,
    useCount: 45,
  },
  {
    slug: "summa-minimal",
    name: "Summa Minimal",
    category: "graduation",
    shortDescription: "Type only. No ornament.",
    description:
      "A typographic graduation piece with no imagery at all. The cheapest to print and the fastest to fill in.",
    designer: "Cebu Type Co.",
    tags: ["typographic", "minimal", "graduation", "modern"],
    colors: ["black", "white"],
    styles: ["minimal", "modern"],
    features: ["rsvp"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 5,
    useCount: 19,
  },
  {
    slug: "quarterly-gala",
    name: "Quarterly Gala",
    category: "corporate",
    shortDescription: "Formal corporate evening.",
    description:
      "A corporate gala suite with space for sponsor marks and a programme. Restrained enough to carry a company logo without fighting it.",
    designer: "ML Printing Studio",
    tags: ["corporate", "gala", "formal", "sponsors"],
    colors: ["charcoal", "gold"],
    styles: ["elegant", "modern"],
    features: ["rsvp", "timeline", "map"],
    orientation: "LANDSCAPE",
    tier: "PREMIUM",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 180,
    useCount: 71,
  },
  {
    slug: "product-launch",
    name: "Product Launch",
    category: "corporate",
    shortDescription: "Screen-first launch announcement.",
    description:
      "Built for a launch event: a landing page with an RSVP and a countdown, plus a simple printed companion card for the room.",
    designer: "Isla Studio",
    tags: ["launch", "corporate", "modern", "tech"],
    colors: ["indigo", "white"],
    styles: ["modern", "minimal"],
    features: ["rsvp", "map", "countdown"],
    orientation: "LANDSCAPE",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 12,
    useCount: 33,
  },
  {
    slug: "noche-buena",
    name: "Noche Buena",
    category: "custom",
    shortDescription: "Christmas gathering, warm and red.",
    description:
      "A Christmas invitation for family gatherings, with parol-inspired geometry and a deep red ground.",
    designer: "ML Printing Studio",
    tags: ["christmas", "parol", "family", "festive"],
    colors: ["red", "gold"],
    styles: ["classic", "playful"],
    features: ["rsvp", "gallery"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 60,
    useCount: 41,
    collections: ["christmas"],
  },
  {
    slug: "fiesta-banderitas",
    name: "Fiesta Banderitas",
    category: "custom",
    shortDescription: "Banderitas and bright colour.",
    description:
      "A fiesta invitation built on banderitas bunting. Loud on purpose, and the most Cebuano thing in the catalogue.",
    designer: "Cebu Type Co.",
    tags: ["fiesta", "banderitas", "festive", "colourful"],
    colors: ["coral", "yellow"],
    styles: ["playful", "rustic"],
    features: ["rsvp", "map", "gallery"],
    orientation: "SQUARE",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 100,
    useCount: 58,
    collections: ["summer"],
  },
  {
    slug: "reunion-table",
    name: "Reunion Table",
    category: "custom",
    shortDescription: "Family reunion, long tables.",
    description:
      "A reunion invitation with room for a family tree and a programme. Sits in Custom because a reunion is not any of the other categories — which is the point of Custom.",
    designer: "Isla Studio",
    tags: ["reunion", "family", "gathering", "programme"],
    colors: ["sage", "kraft"],
    styles: ["rustic", "classic"],
    features: ["rsvp", "gallery", "map", "timeline"],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: true,
    websiteCompatible: true,
    isFeatured: false,
    publishedDaysAgo: 150,
    useCount: 24,
  },
  {
    slug: "draft-preview-only",
    name: "Unreleased Concept",
    category: "custom",
    shortDescription: "Should never appear in the marketplace.",
    description:
      "An unpublished draft. Seeded on purpose: it is the fixture that proves buildWhere's publication check works against a real database, and not only in unit tests.",
    designer: "ML Printing Studio",
    tags: ["draft"],
    colors: ["black"],
    styles: ["minimal"],
    features: [],
    orientation: "PORTRAIT",
    tier: "FREE",
    printCompatible: false,
    websiteCompatible: false,
    isFeatured: false,
    publishedDaysAgo: -1, // Sentinel: never published.
    useCount: 0,
  },
];

/** Colour filter vocabulary — Ph2.md §4 Color Theme. Derived, so it cannot drift from the templates. */
export function seedColors(): string[] {
  return [...new Set(TEMPLATES.flatMap((t) => t.colors))].sort();
}

/** Style filter vocabulary — Ph2.md §4 Style. */
export function seedStyles(): string[] {
  return [...new Set(TEMPLATES.flatMap((t) => t.styles))].sort();
}
