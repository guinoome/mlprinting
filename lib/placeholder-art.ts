/**
 * Invitation cover art.
 *
 * The catalogue is browsed by thumbnail (FDG-ML-DEP-STD-015 §3, §5), so the
 * cover is not decoration around a template — for a browsing customer it *is*
 * the template. This module renders one, deterministically, from a slug.
 *
 * Two dimensions decide what gets drawn. The *family* comes from the event
 * category and fixes the palette and the eyebrow line; the *style* comes from
 * the template and fixes the composition — a gold-foil wedding and a floral
 * wedding share their colours and their words but look nothing alike. That
 * split is what lets fifty templates avoid looking like one template fifty
 * times.
 *
 * SVG, because a few kilobytes of vector scales to any thumbnail size, needs no
 * image pipeline, and is served immutable. Pure and framework-free: the route
 * handler turns the string into a response; this file has no idea a request
 * exists.
 */

/**
 * FNV-1a. A hash, not a secure one — the only requirement is that a slug maps
 * to the same cover every time and that similar slugs differ.
 */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** A deterministic 0..1 stream from the seed, so every cover is stable. */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/** Escape text for XML. The label is data; a quote in a name must not break the document. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const f = (n: number) => n.toFixed(1);

interface Palette {
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
  soft: string;
  /** True for dark covers — the frame and eyebrow flip to the light ink. */
  dark?: boolean;
}

/**
 * How a cover is composed. The category decides the colours; this decides the
 * shape of the thing, which is what a customer actually scans for.
 */
export type ArtStyle =
  | "classic"
  | "floral"
  | "gold-foil"
  | "luxury"
  | "kids"
  | "fairy"
  | "portrait"
  | "minimal";

export const ART_STYLES: ArtStyle[] = [
  "classic",
  "floral",
  "gold-foil",
  "luxury",
  "kids",
  "fairy",
  "portrait",
  "minimal",
];

export function isArtStyle(value: string): value is ArtStyle {
  return (ART_STYLES as string[]).includes(value);
}

interface Family {
  eyebrow: string;
  /** Composition used when a template does not name one. */
  defaultStyle: ArtStyle;
  palettes: Palette[];
}

/**
 * One palette set and one voice per occasion. Restrained on purpose: the
 * corporate and memorial families carry the only dark and the only grey covers,
 * and a catalogue where everything shouts reads as cheap.
 */
const FAMILIES: Record<string, Family> = {
  wedding: {
    eyebrow: "TOGETHER WITH OUR FAMILIES",
    defaultStyle: "floral",
    palettes: [
      { bg: "#faf6ef", bg2: "#f1e8d8", ink: "#4a4038", accent: "#b08d3c", soft: "#d8c79a" },
      { bg: "#fbf3f2", bg2: "#f2e2e2", ink: "#5a3f42", accent: "#c0868c", soft: "#e3c4c6" },
      { bg: "#f2f5f0", bg2: "#e3ece0", ink: "#3a453c", accent: "#7d977f", soft: "#bccdb8" },
      { bg: "#eef4f5", bg2: "#dce9eb", ink: "#33454b", accent: "#6f97a1", soft: "#b6ced2" },
    ],
  },
  engagement: {
    eyebrow: "WE SAID YES",
    defaultStyle: "floral",
    palettes: [
      { bg: "#fbf2f1", bg2: "#f3e0de", ink: "#54393c", accent: "#c08a86", soft: "#e6c6c2" },
      { bg: "#f7f4ee", bg2: "#ece5d8", ink: "#4a4236", accent: "#b08d3c", soft: "#dcc99b" },
    ],
  },
  debut: {
    eyebrow: "A DEBUT CELEBRATION",
    defaultStyle: "gold-foil",
    palettes: [
      { bg: "#fbf1ec", bg2: "#f2ded2", ink: "#5a3f3a", accent: "#bd8b6e", soft: "#e2c6ad" },
      { bg: "#1d1620", bg2: "#2b2030", ink: "#f4e7ea", accent: "#c9a227", soft: "#8d7a86", dark: true },
    ],
  },
  birthday: {
    eyebrow: "PLEASE JOIN US",
    defaultStyle: "kids",
    palettes: [
      // Saturated and dark-grounded on purpose. A children's party cover that
      // whispers is a children's party cover nobody picks.
      { bg: "#c62b2b", bg2: "#7d1414", ink: "#fff6ee", accent: "#ffd166", soft: "#ff8fa3", dark: true },
      { bg: "#1f8a70", bg2: "#0f5646", ink: "#f3fff9", accent: "#ffd166", soft: "#8ae0c4", dark: true },
      { bg: "#6a4bb5", bg2: "#3d2a75", ink: "#f6f1ff", accent: "#ffd166", soft: "#c3aef0", dark: true },
    ],
  },
  christening: {
    eyebrow: "WITH JOYFUL HEARTS",
    defaultStyle: "fairy",
    palettes: [
      { bg: "#f7f5ec", bg2: "#ebe8d5", ink: "#43452f", accent: "#8a8a55", soft: "#c6c69a" },
      { bg: "#f0f4f8", bg2: "#dde7f0", ink: "#33414a", accent: "#7d9bc0", soft: "#bcd2e4" },
    ],
  },
  "baby-shower": {
    eyebrow: "A LITTLE ONE IS ON THE WAY",
    defaultStyle: "floral",
    palettes: [
      { bg: "#f7f4ef", bg2: "#eae4d9", ink: "#4a4438", accent: "#a39a7c", soft: "#cfc7ae" },
      { bg: "#eff6f4", bg2: "#dcebe6", ink: "#334744", accent: "#6fa396", soft: "#b3d6cb" },
    ],
  },
  anniversary: {
    eyebrow: "CELEBRATING YEARS TOGETHER",
    defaultStyle: "gold-foil",
    palettes: [
      { bg: "#faf5ea", bg2: "#f0e6cf", ink: "#4a4230", accent: "#b08d3c", soft: "#ddc78d" },
      { bg: "#f7efec", bg2: "#ecdcd6", ink: "#4a2328", accent: "#8c2f39", soft: "#cca77a" },
    ],
  },
  graduation: {
    eyebrow: "WITH PRIDE, WE INVITE YOU",
    defaultStyle: "classic",
    palettes: [
      { bg: "#f1f3f7", bg2: "#dfe4ee", ink: "#2b3450", accent: "#b08d3c", soft: "#aab3cc" },
      { bg: "#f1f4ef", bg2: "#e0e8dd", ink: "#2f3a2f", accent: "#5a7a52", soft: "#adc4a4" },
    ],
  },
  corporate: {
    eyebrow: "YOU ARE CORDIALLY INVITED",
    defaultStyle: "luxury",
    palettes: [
      { bg: "#1f2836", bg2: "#161d28", ink: "#f3ecdd", accent: "#c9a227", soft: "#6c7789", dark: true },
      { bg: "#f4f2ee", bg2: "#e7e3da", ink: "#2b2f38", accent: "#b08d3c", soft: "#b8b2a4" },
    ],
  },
  reunion: {
    eyebrow: "LET US GATHER AGAIN",
    defaultStyle: "classic",
    palettes: [
      { bg: "#f2f4f7", bg2: "#e0e5ee", ink: "#2c3550", accent: "#b08d3c", soft: "#aab4cb" },
      { bg: "#f6f3ec", bg2: "#e9e2d3", ink: "#43402f", accent: "#8a7a4f", soft: "#c8bd9c" },
    ],
  },
  family: {
    eyebrow: "COME AND JOIN US",
    defaultStyle: "portrait",
    palettes: [
      { bg: "#faf5ec", bg2: "#ede2cd", ink: "#4a4131", accent: "#9a7a4a", soft: "#d3bf95" },
      { bg: "#f4f5ef", bg2: "#e5e8dc", ink: "#3f4536", accent: "#7a8a5f", soft: "#bfc9a8" },
    ],
  },
  fiesta: {
    eyebrow: "MABUHAY — JOIN THE FIESTA",
    defaultStyle: "kids",
    palettes: [
      { bg: "#d4442c", bg2: "#8f2416", ink: "#fff4ea", accent: "#ffd166", soft: "#ffa06b", dark: true },
      { bg: "#e08a1e", bg2: "#a85c0c", ink: "#fffaf0", accent: "#ffe9a8", soft: "#ffc266", dark: true },
    ],
  },
  religious: {
    eyebrow: "WITH THANKSGIVING",
    defaultStyle: "minimal",
    palettes: [
      { bg: "#f9f7f0", bg2: "#eee9da", ink: "#453f30", accent: "#8e8354", soft: "#cabf98" },
      { bg: "#f3f6f7", bg2: "#e2eaee", ink: "#354248", accent: "#6d8b99", soft: "#b4c9d3" },
    ],
  },
  community: {
    eyebrow: "EVERYONE IS WELCOME",
    defaultStyle: "minimal",
    palettes: [
      { bg: "#f2f4f8", bg2: "#e1e6f0", ink: "#2b3446", accent: "#4a6a94", soft: "#a9b8cd" },
      { bg: "#f5f4ef", bg2: "#e8e5d9", ink: "#3f3f33", accent: "#7d7a56", soft: "#c3bfa0" },
    ],
  },
  /** A memorial notice, not a celebration. The quietest palette in the set. */
  funeral: {
    eyebrow: "IN LOVING MEMORY",
    defaultStyle: "minimal",
    palettes: [
      { bg: "#f6f6f4", bg2: "#e8e8e4", ink: "#3f4144", accent: "#8b8d88", soft: "#c3c5c0" },
      { bg: "#f5f5ef", bg2: "#e6e7dc", ink: "#3f4438", accent: "#7d8467", soft: "#bec4ac" },
    ],
  },
  custom: {
    eyebrow: "AN INVITATION",
    defaultStyle: "classic",
    palettes: [
      { bg: "#faf5ea", bg2: "#efe4cd", ink: "#41392c", accent: "#b08d3c", soft: "#dbc890" },
      { bg: "#f5f3f6", bg2: "#e7e2ea", ink: "#3d3648", accent: "#8f7bb0", soft: "#c9bcdc" },
    ],
  },
};

const FALLBACK: Family = FAMILIES.custom!;

/**
 * Display names and older labels that do not equal their family key. Callers
 * pass whatever they hold — the seed passes a category's display name, the
 * marketplace its slug — and both must land on the same family. Getting this
 * wrong is not cosmetic: "Memorial" once fell through to the celebratory
 * custom cover.
 */
const FAMILY_ALIASES: Record<string, string> = {
  memorial: "funeral",
  baptism: "christening",
  dedication: "christening",
  proposal: "engagement",
  "family-celebration": "family",
  "community-event": "community",
  "corporate-event": "corporate",
  handaan: "family",
};

function normaliseKey(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function familyFor(caption: string | undefined): Family {
  const key = normaliseKey(caption);
  return FAMILIES[FAMILY_ALIASES[key] ?? key] ?? FALLBACK;
}

/* ---------------------------------------------------------------- drawing */

/**
 * A metallic ramp rather than a flat swatch. Real foil catches light across
 * the stroke, and a single gold hex is the thing that most makes a "luxury"
 * design read as cheap.
 */
function foilDefs(id: string, accent: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="0.28" stop-color="#f6e6b4"/>
      <stop offset="0.5" stop-color="${accent}"/>
      <stop offset="0.72" stop-color="#fbf1cf"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.6"/>
    </linearGradient>`;
}

/** A pointed leaf — two quadratic curves meeting at a tip. */
function leaf(x: number, y: number, angle: number, len: number, fill: string, opacity = 1): string {
  const rad = (angle * Math.PI) / 180;
  const tx = x + Math.cos(rad) * len;
  const ty = y + Math.sin(rad) * len;
  const w = len * 0.32;
  const px = -Math.sin(rad) * w;
  const py = Math.cos(rad) * w;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return `<path d="M ${f(x)} ${f(y)} Q ${f(mx + px)} ${f(my + py)} ${f(tx)} ${f(ty)} Q ${f(mx - px)} ${f(my - py)} ${f(x)} ${f(y)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

/** A rose read from above: nested arcs opening the same way. */
function rose(cx: number, cy: number, r: number, fill: string, ink: string): string {
  // Petals read as a flower only if the spiral is visible against the face, so
  // the face is lightened and the spiral drawn in the accent, not in a wash of
  // the same colour. At thumbnail size this is the difference between a rose
  // and a dot.
  const parts = [
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"/>`,
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#fff" opacity="0.45"/>`,
  ];
  for (let i = 3; i >= 1; i--) {
    const rr = (r * i) / 3.4;
    const flip = i % 2 ? 1 : 0;
    parts.push(
      `<path d="M ${f(cx - rr)} ${f(cy)} A ${f(rr)} ${f(rr)} 0 1 ${flip} ${f(cx + rr)} ${f(cy)}" fill="none" stroke="${ink}" stroke-width="${f(Math.max(0.6, r * 0.13))}" opacity="0.5" stroke-linecap="round"/>`,
    );
  }
  return parts.join("");
}

/** A four-point sparkle. The star of the fairy and gold-foil compositions. */
function sparkle(x: number, y: number, r: number, fill: string, opacity: number): string {
  const w = r * 0.24;
  return `<path d="M ${f(x)} ${f(y - r)} Q ${f(x + w)} ${f(y - w)} ${f(x + r)} ${f(y)} Q ${f(x + w)} ${f(y + w)} ${f(x)} ${f(y + r)} Q ${f(x - w)} ${f(y + w)} ${f(x - r)} ${f(y)} Q ${f(x - w)} ${f(y - w)} ${f(x)} ${f(y - r)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

/**
 * A floral ring the title sits inside.
 *
 * An earlier version drew a half-arch above the title and left the lower two
 * thirds of the cover empty; encircling the words instead fills the frame the
 * way a printed invitation does, and gives the eye somewhere to land. The ring
 * opens slightly at the bottom so the divider and category can break it.
 */
function wreath(cx: number, cy: number, r: number, p: Palette, seed: number): string {
  const rand = rng(seed);
  const parts: string[] = [];
  const N = 34;
  for (let i = 0; i < N; i++) {
    // Leave a gap at the bottom of the ring rather than closing it.
    const t = i / N;
    const a = (-95 + t * 350) * (Math.PI / 180);
    if (a > (72 * Math.PI) / 180 && a < (108 * Math.PI) / 180) continue;
    const wobble = 1 + (rand() - 0.5) * 0.08;
    const bx = cx + Math.cos(a) * r * wobble;
    const by = cy + Math.sin(a) * r * wobble * 1.06;
    const outward = (a * 180) / Math.PI + 90;
    parts.push(leaf(bx, by, outward, r * (0.2 + rand() * 0.08), p.accent, 0.8));
    parts.push(leaf(bx, by, outward - 40, r * 0.14, p.soft, 0.7));
    parts.push(leaf(bx, by, outward + 38, r * 0.12, p.soft, 0.55));
  }
  // Roses in three clusters around the ring, small enough to read as flowers
  // rather than as dots.
  for (const [ang, size] of [
    [-90, 0.115],
    [-150, 0.085],
    [-28, 0.095],
    [155, 0.08],
    [40, 0.07],
  ] as const) {
    const a = (ang * Math.PI) / 180;
    parts.push(
      rose(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.06, r * size * 1.25, p.soft, p.accent),
    );
  }
  return `<g>${parts.join("")}</g>`;
}

/** Corner filigree — four mirrored quarter-flourishes inside the frame. */
function corners(w: number, h: number, inset: number, stroke: string, scale: number): string {
  const L = 46 * scale;
  const one = (x: number, y: number, sx: number, sy: number) =>
    `<g transform="translate(${f(x)} ${f(y)}) scale(${sx} ${sy})">
      <path d="M 0 ${f(L)} Q 0 0 ${f(L)} 0" fill="none" stroke="${stroke}" stroke-width="${f(1.1 * scale)}" opacity="0.9"/>
      <path d="M ${f(L * 0.18)} ${f(L)} Q ${f(L * 0.18)} ${f(L * 0.18)} ${f(L)} ${f(L * 0.18)}" fill="none" stroke="${stroke}" stroke-width="${f(0.7 * scale)}" opacity="0.6"/>
      <circle cx="${f(L * 0.1)}" cy="${f(L * 0.1)}" r="${f(2.2 * scale)}" fill="${stroke}" opacity="0.85"/>
    </g>`;
  return [
    one(inset, inset, 1, 1),
    one(w - inset, inset, -1, 1),
    one(inset, h - inset, 1, -1),
    one(w - inset, h - inset, -1, -1),
  ].join("");
}

/**
 * An illustrated character, drawn rather than photographed.
 *
 * This is the "photo-based" family's hero. It is a stylised cartoon — a
 * generic face that resembles nobody — so there is no photograph to licence
 * and no real person's likeness in the catalogue. Two of them make a couple,
 * one makes a birthday or a graduate.
 */
function character(
  cx: number,
  groundY: number,
  h: number,
  kind: "gown" | "suit" | "child" | "toga",
  skin: string,
  hair: string,
  outfit: string,
  ink: string,
): string {
  const headR = h * (kind === "child" ? 0.15 : 0.115);
  const headCy = groundY - h * (kind === "child" ? 0.62 : 0.78);
  const shoulderY = headCy + headR * 1.5;
  const parts: string[] = [];

  // Body first so the head overlaps it cleanly.
  if (kind === "gown") {
    parts.push(
      `<path d="M ${f(cx - h * 0.1)} ${f(shoulderY)} Q ${f(cx - h * 0.09)} ${f(shoulderY + h * 0.16)} ${f(cx - h * 0.21)} ${f(groundY)} L ${f(cx + h * 0.21)} ${f(groundY)} Q ${f(cx + h * 0.09)} ${f(shoulderY + h * 0.16)} ${f(cx + h * 0.1)} ${f(shoulderY)} Z" fill="${outfit}"/>`,
    );
  } else if (kind === "child") {
    parts.push(
      `<path d="M ${f(cx - h * 0.11)} ${f(shoulderY)} L ${f(cx - h * 0.15)} ${f(groundY)} L ${f(cx + h * 0.15)} ${f(groundY)} L ${f(cx + h * 0.11)} ${f(shoulderY)} Z" fill="${outfit}"/>`,
    );
  } else {
    const hip = groundY - h * 0.34;
    parts.push(
      `<path d="M ${f(cx - h * 0.115)} ${f(shoulderY)} L ${f(cx - h * 0.095)} ${f(hip)} L ${f(cx + h * 0.095)} ${f(hip)} L ${f(cx + h * 0.115)} ${f(shoulderY)} Z" fill="${outfit}"/>`,
      `<rect x="${f(cx - h * 0.095)}" y="${f(hip - 1)}" width="${f(h * 0.08)}" height="${f(groundY - hip + 1)}" fill="${outfit}"/>`,
      `<rect x="${f(cx + h * 0.015)}" y="${f(hip - 1)}" width="${f(h * 0.08)}" height="${f(groundY - hip + 1)}" fill="${outfit}"/>`,
    );
    if (kind === "suit") {
      parts.push(
        `<path d="M ${f(cx)} ${f(shoulderY)} L ${f(cx - h * 0.03)} ${f(shoulderY + h * 0.09)} L ${f(cx)} ${f(shoulderY + h * 0.14)} L ${f(cx + h * 0.03)} ${f(shoulderY + h * 0.09)} Z" fill="#fff" opacity="0.85"/>`,
      );
    }
  }

  parts.push(`<circle cx="${f(cx)}" cy="${f(headCy)}" r="${f(headR)}" fill="${skin}"/>`);

  // Hair sits over the top of the head; the gown reads as long hair.
  if (kind === "gown" || kind === "child") {
    // A cap over the crown plus a lock down each side, rather than one shape
    // sweeping across the face. The single sweep covered the eyes and mouth
    // entirely — they were still drawn, but on top of a dark mass, so every
    // lone figure looked hooded.
    const lock = (dir: number) =>
      `<path d="M ${f(cx + dir * headR * 0.97)} ${f(headCy - headR * 0.1)} Q ${f(cx + dir * headR * 1.12)} ${f(headCy + headR * 0.55)} ${f(cx + dir * headR * 0.86)} ${f(headCy + headR * 0.95)} Q ${f(cx + dir * headR * 0.6)} ${f(headCy + headR * 0.7)} ${f(cx + dir * headR * 0.66)} ${f(headCy - headR * 0.1)} Z" fill="${hair}"/>`;
    parts.push(
      `<path d="M ${f(cx - headR)} ${f(headCy - headR * 0.08)} A ${f(headR)} ${f(headR)} 0 0 1 ${f(cx + headR)} ${f(headCy - headR * 0.08)} Q ${f(cx)} ${f(headCy + headR * 0.18)} ${f(cx - headR)} ${f(headCy - headR * 0.08)} Z" fill="${hair}"/>`,
      lock(-1),
      lock(1),
    );
  } else {
    parts.push(
      `<path d="M ${f(cx - headR)} ${f(headCy - headR * 0.1)} A ${f(headR)} ${f(headR)} 0 0 1 ${f(cx + headR)} ${f(headCy - headR * 0.1)} Q ${f(cx)} ${f(headCy - headR * 0.55)} ${f(cx - headR)} ${f(headCy - headR * 0.1)} Z" fill="${hair}"/>`,
    );
  }

  // A face with two dots and an arc. Anything more detailed stops reading at
  // thumbnail size and starts looking like a specific person.
  const eyeY = headCy + headR * 0.05;
  const eyeDx = headR * 0.36;
  parts.push(
    `<circle cx="${f(cx - eyeDx)}" cy="${f(eyeY)}" r="${f(headR * 0.1)}" fill="${ink}"/>`,
    `<circle cx="${f(cx + eyeDx)}" cy="${f(eyeY)}" r="${f(headR * 0.1)}" fill="${ink}"/>`,
    `<path d="M ${f(cx - headR * 0.26)} ${f(headCy + headR * 0.42)} Q ${f(cx)} ${f(headCy + headR * 0.66)} ${f(cx + headR * 0.26)} ${f(headCy + headR * 0.42)}" fill="none" stroke="${ink}" stroke-width="${f(headR * 0.09)}" stroke-linecap="round" opacity="0.85"/>`,
    `<circle cx="${f(cx - headR * 0.62)}" cy="${f(headCy + headR * 0.3)}" r="${f(headR * 0.14)}" fill="#e08b8b" opacity="0.45"/>`,
    `<circle cx="${f(cx + headR * 0.62)}" cy="${f(headCy + headR * 0.3)}" r="${f(headR * 0.14)}" fill="#e08b8b" opacity="0.45"/>`,
  );

  if (kind === "toga") {
    const capY = headCy - headR * 1.05;
    const capW = headR * 1.9;
    parts.push(
      `<path d="M ${f(cx - capW)} ${f(capY)} L ${f(cx)} ${f(capY - headR * 0.5)} L ${f(cx + capW)} ${f(capY)} L ${f(cx)} ${f(capY + headR * 0.5)} Z" fill="${ink}"/>`,
      `<line x1="${f(cx + capW * 0.6)}" y1="${f(capY)}" x2="${f(cx + capW * 0.6)}" y2="${f(capY + headR * 1.3)}" stroke="${ink}" stroke-width="${f(headR * 0.09)}"/>`,
    );
  }
  return `<g>${parts.join("")}</g>`;
}

/** Balloons on strings — the kids composition's signature. */
function balloons(cx: number, topY: number, scale: number, p: Palette, seed: number): string {
  const rand = rng(seed);
  const cols = [p.accent, p.soft, "#f2c14e", "#7fb8a4"];
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 34 * scale + (rand() - 0.5) * 10 * scale;
    const y = topY + rand() * 26 * scale;
    const r = (16 + rand() * 6) * scale;
    const col = cols[i % cols.length]!;
    parts.push(
      `<path d="M ${f(x)} ${f(y + r * 1.25)} Q ${f(x + r * 0.5)} ${f(y + r * 2.6)} ${f(x)} ${f(y + r * 4)}" fill="none" stroke="${p.ink}" stroke-width="${f(0.8 * scale)}" opacity="0.35"/>`,
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.82)}" ry="${f(r)}" fill="${col}" opacity="0.92"/>`,
      `<ellipse cx="${f(x - r * 0.26)}" cy="${f(y - r * 0.3)}" rx="${f(r * 0.2)}" ry="${f(r * 0.28)}" fill="#fff" opacity="0.4"/>`,
    );
  }
  return `<g>${parts.join("")}</g>`;
}

/** An art-deco sunburst fan and stepped arcs. */
function deco(cx: number, cy: number, scale: number, stroke: string, soft: string): string {
  const rays: string[] = [];
  for (let i = -6; i <= 6; i++) {
    const a = (-90 + i * 8) * (Math.PI / 180);
    const len = (56 - Math.abs(i) * 2.4) * scale;
    rays.push(
      `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(cx + Math.cos(a) * len)}" y2="${f(cy + Math.sin(a) * len)}" stroke="${stroke}" stroke-width="${f(1.3 * scale)}" opacity="0.9"/>`,
    );
  }
  return `<g>${rays.join("")}<path d="M ${f(cx - 64 * scale)} ${f(cy)} A ${f(64 * scale)} ${f(64 * scale)} 0 0 1 ${f(cx + 64 * scale)} ${f(cy)}" fill="none" stroke="${stroke}" stroke-width="${f(1.5 * scale)}"/><path d="M ${f(cx - 48 * scale)} ${f(cy)} A ${f(48 * scale)} ${f(48 * scale)} 0 0 1 ${f(cx + 48 * scale)} ${f(cy)}" fill="none" stroke="${soft}" stroke-width="${f(1 * scale)}" opacity="0.8"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(3.4 * scale)}" fill="${stroke}"/></g>`;
}

/** A scatter of sparkles across the upper field. */
function sparkleField(w: number, topY: number, depth: number, p: Palette, seed: number): string {
  const rand = rng(seed);
  const parts: string[] = [];
  for (let i = 0; i < 22; i++) {
    const x = w * 0.08 + rand() * w * 0.84;
    const y = topY + rand() * depth;
    const r = (2 + rand() * 6) * (w / 600);
    parts.push(sparkle(x, y, r, i % 3 === 0 ? p.soft : p.accent, 0.35 + rand() * 0.5));
  }
  return `<g>${parts.join("")}</g>`;
}

/** A slim olive branch. Used where restraint is the point. */
function olive(cx: number, topY: number, scale: number, p: Palette): string {
  const parts: string[] = [
    `<path d="M ${f(cx)} ${f(topY)} Q ${f(cx - 2)} ${f(topY + 44 * scale)} ${f(cx)} ${f(topY + 92 * scale)}" fill="none" stroke="${p.accent}" stroke-width="${f(1.4 * scale)}" opacity="0.85"/>`,
  ];
  for (let i = 0; i < 5; i++) {
    const y = topY + (14 + i * 17) * scale;
    parts.push(leaf(cx, y, -30, (21 - i * 1.6) * scale, p.accent, 0.9));
    parts.push(leaf(cx, y + 6 * scale, 210, (21 - i * 1.6) * scale, p.accent, 0.9));
  }
  return `<g>${parts.join("")}</g>`;
}

/* -------------------------------------------------------------- composing */

/** Fit the title: shrink for long names so a two-word title never clips the frame. */
function titleSize(label: string, w: number, style: ArtStyle): number {
  const base = w * (style === "minimal" ? 0.082 : 0.094);
  const over = Math.max(0, label.length - 10);
  return Math.max(w * 0.048, base - over * (w * 0.0032));
}

export interface PlaceholderOptions {
  seed: string;
  label: string;
  /** Category name or slug, e.g. "Wedding" — chooses palette and eyebrow. */
  caption?: string;
  /** Composition. Falls back to the family's own default. */
  style?: string;
  width: number;
  height: number;
}

/**
 * A finished invitation cover.
 *
 * Every composition shares the same skeleton — ground, frame, ornament, title
 * block, footer — so a grid of them lines up while still reading as distinct
 * designs. Only the ornament and the vertical rhythm change per style.
 */
export function placeholderCover({
  seed,
  label,
  caption,
  style,
  width,
  height,
}: PlaceholderOptions): string {
  const h = hash(seed);
  const family = familyFor(caption);
  const p = family.palettes[h % family.palettes.length]!;
  const requested = normaliseKey(style);
  const art: ArtStyle = isArtStyle(requested) ? requested : family.defaultStyle;

  const s = width / 600;
  const cx = width / 2;
  const inset = Math.round(width * 0.055);
  const ink = p.dark ? p.soft : p.ink;
  const first = label.trim()[0];
  const glyph = first ? escapeXml(first.toUpperCase()) : "·";

  const serif = "Didot, 'Bodoni MT', 'Hoefler Text', Georgia, 'Times New Roman', serif";
  const sans = "'Gill Sans', 'Century Gothic', 'Futura', 'Segoe UI', system-ui, sans-serif";

  const metallic = art === "gold-foil" || art === "luxury";
  const frameStroke = metallic ? "url(#foil)" : p.accent;

  // Where the title block sits, and what fills the space above and below it.
  let ornament = "";
  let below = "";
  let titleY = height * 0.5;

  const tSize = titleSize(label, width, art);

  switch (art) {
    case "floral": {
      // The ring encircles the title, so it is placed at the title, not above it.
      titleY = height * 0.5;
      ornament = wreath(cx, titleY - height * 0.012, width * 0.335, p, h);
      break;
    }
    case "gold-foil": {
      // Foil needs something to catch against. On a pale ground the metallic
      // ramp all but vanishes, so the type block sits on a tinted panel that
      // deepens the contrast without turning the whole cover dark.
      const panelY = height * 0.3;
      ornament =
        sparkleField(width, height * 0.1, height * 0.16, p, h) +
        `<rect x="${f(inset + 26)}" y="${f(panelY)}" width="${f(width - (inset + 26) * 2)}" height="${f(height * 0.38)}" fill="none" stroke="url(#foil)" stroke-width="${f(0.9 * s)}" opacity="0.75"/>` +
        `<g>${deco(cx, height * 0.29, s * 0.78, "url(#foil)", p.soft)}</g>`;
      titleY = height * 0.5;
      below = `<g>${sparkle(cx, height * 0.735, 15 * s, "url(#foil)", 0.95)}${sparkle(cx - 46 * s, height * 0.735, 7 * s, p.soft, 0.8)}${sparkle(cx + 46 * s, height * 0.735, 7 * s, p.soft, 0.8)}</g>`;
      break;
    }
    case "luxury": {
      ornament =
        `<g>${deco(cx, height * 0.3, s * 1.05, "url(#foil)", p.soft)}</g>` +
        sparkleField(width, height * 0.11, height * 0.1, p, h);
      titleY = height * 0.53;
      below = `<g><line x1="${f(cx - width * 0.2)}" y1="${f(height * 0.75)}" x2="${f(cx + width * 0.2)}" y2="${f(height * 0.75)}" stroke="url(#foil)" stroke-width="${f(1.2 * s)}"/><rect x="${f(cx - 5 * s)}" y="${f(height * 0.75 - 5 * s)}" width="${f(10 * s)}" height="${f(10 * s)}" fill="url(#foil)" transform="rotate(45 ${f(cx)} ${f(height * 0.75)})"/></g>`;
      break;
    }
    case "kids": {
      // Bunting across the top, balloons under it, confetti at the foot: three
      // bands of colour so the cover reads as a party from thumbnail size.
      const bunt: string[] = [];
      for (let i = 0; i < 9; i++) {
        const x = inset + 14 + ((width - (inset + 14) * 2) / 8) * i;
        const dip = height * 0.105 + (i % 2 ? 6 : 0) * s;
        const col = [p.accent, p.soft, "#f2c14e", "#7fb8a4"][i % 4]!;
        bunt.push(`<path d="M ${f(x - 13 * s)} ${f(dip)} L ${f(x + 13 * s)} ${f(dip)} L ${f(x)} ${f(dip + 26 * s)} Z" fill="${col}" opacity="0.9"/>`);
      }
      ornament =
        `<path d="M ${f(inset + 14)} ${f(height * 0.1)} Q ${f(cx)} ${f(height * 0.135)} ${f(width - inset - 14)} ${f(height * 0.1)}" fill="none" stroke="${p.ink}" stroke-width="${f(1 * s)}" opacity="0.35"/>` +
        `<g>${bunt.join("")}</g>` +
        balloons(cx, height * 0.2, s * 1.35, p, h);
      titleY = height * 0.6;
      below = `<g>${Array.from({ length: 14 }, (_, i) => { const r2 = rng(h + i * 7); const x = width * (0.1 + r2() * 0.8); const y = height * (0.74 + r2() * 0.11); const col = [p.accent, p.soft, "#f2c14e"][i % 3]!; return i % 2 ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f((3 + r2() * 4) * s)}" fill="${col}" opacity="0.8"/>` : `<rect x="${f(x)}" y="${f(y)}" width="${f(7 * s)}" height="${f(7 * s)}" fill="${col}" opacity="0.75" transform="rotate(${f(r2() * 70)} ${f(x)} ${f(y)})"/>`; }).join("")}</g>`;
      break;
    }
    case "fairy": {
      // A crescent of sparkles arcing over the title, brightest at the crown,
      // with dust falling through the whole upper field.
      const arc: string[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const a = (Math.PI * (1.06 - t * 1.12));
        const rr = width * 0.3;
        const x = cx + Math.cos(a) * rr;
        const y = height * 0.42 - Math.sin(a) * rr * 0.72;
        const size = (5 + Math.sin(t * Math.PI) * 13) * s;
        arc.push(sparkle(x, y, size, i % 3 === 0 ? p.soft : p.accent, 0.5 + Math.sin(t * Math.PI) * 0.5));
      }
      ornament =
        sparkleField(width, height * 0.08, height * 0.26, p, h) +
        `<g>${arc.join("")}</g>`;
      titleY = height * 0.55;
      below = `<g>${sparkle(cx, height * 0.73, 11 * s, p.accent, 0.9)}${sparkle(cx - 34 * s, height * 0.745, 6 * s, p.soft, 0.7)}${sparkle(cx + 34 * s, height * 0.745, 6 * s, p.soft, 0.7)}</g>`;
      break;
    }
    case "portrait": {
      const pair = ["wedding", "engagement", "anniversary"].includes(
        normaliseKey(caption),
      );

      // The figure is measured from the space the text block leaves, not set to
      // a fixed fraction of the card. A lone child at a fixed 42% left roughly
      // a sixth of the cover empty between the category line and the top of the
      // head, which a couple hid only because two figures are wider.
      titleY = height * 0.3;
      const textBottom = titleY + tSize * 0.72 + height * 0.045;
      const groundY = height * 0.93;
      const fh = (groundY - textBottom - height * 0.02) * 0.94;

      // Clear the tallest point of whichever figure is drawn: the couple's
      // heads sit higher up their own height than the child's do.
      const archTop = groundY - fh * (pair ? 0.98 : 0.85);
      const archHalf = width * (pair ? 0.28 : 0.2);
      const skin = "#e8c39e";
      const hair = "#3a2a24";
      const arch = `<path d="M ${f(cx - archHalf)} ${f(groundY)} L ${f(cx - archHalf)} ${f(archTop)} A ${f(archHalf)} ${f(archHalf)} 0 0 1 ${f(cx + archHalf)} ${f(archTop)} L ${f(cx + archHalf)} ${f(groundY)} Z" fill="${p.soft}" opacity="0.28"/>`;
      ornament =
        arch +
        (pair
          ? character(cx - fh * 0.14, groundY, fh, "gown", skin, hair, p.soft, p.ink) +
            character(cx + fh * 0.14, groundY, fh, "suit", skin, hair, p.ink, p.ink)
          : character(cx, groundY, fh, "child", skin, hair, p.accent, p.ink));
      break;
    }
    case "minimal": {
      ornament = olive(cx, height * 0.19, s * 0.95, p);
      titleY = height * 0.55;
      below = `<rect x="${f(cx - 4 * s)}" y="${f(height * 0.755 - 4 * s)}" width="${f(8 * s)}" height="${f(8 * s)}" fill="${p.accent}" opacity="0.55" transform="rotate(45 ${f(cx)} ${f(height * 0.755)})"/>`;
      break;
    }
    default: {
      // classic — a monogram medallion, and the only composition that shows the
      // initial. The catalogue's quietest, most formal option.
      const r = 54 * s;
      const my = height * 0.29;
      ornament = `<g><circle cx="${f(cx)}" cy="${f(my)}" r="${f(r)}" fill="none" stroke="${frameStroke}" stroke-width="${f(1.3 * s)}"/><circle cx="${f(cx)}" cy="${f(my)}" r="${f(r - 6 * s)}" fill="none" stroke="${p.soft}" stroke-width="${f(0.8 * s)}" opacity="0.8"/><text x="${f(cx)}" y="${f(my)}" fill="${p.accent}" font-family="${serif}" font-size="${f(56 * s)}" text-anchor="middle" dominant-baseline="central">${glyph}</text></g>`;
      titleY = height * 0.53;
      break;
    }
  }

  const eyebrowSize = Math.max(8, width * 0.0205);
  const catSize = Math.max(8, width * 0.019);
  const eyebrowY = titleY - tSize * 0.86;
  const dividerY = titleY + tSize * 0.72;
  const categoryY = dividerY + height * 0.045;

  /**
   * Shapes that run off the edge of the card.
   *
   * The quiet styles keep their margins — restraint is the whole point of a
   * memorial or a formal wedding suite. The loud ones get corner masses that
   * bleed past the frame, which is what makes a virtual invitation look filled
   * rather than like a small motif marooned on a large pale rectangle.
   */
  // Only the saturated palettes get it. On a pale wedding ground the same
  // circles read as smudges rather than as colour, so the rule is tied to the
  // palette's own depth and not to the style alone.
  const loud = p.dark && (art === "kids" || art === "fairy" || art === "portrait");
  const bleed = loud
    ? `<g opacity="${p.dark ? 0.5 : 0.32}">` +
      `<circle cx="0" cy="0" r="${f(width * 0.42)}" fill="${p.accent}"/>` +
      `<circle cx="${f(width)}" cy="${f(height * 0.06)}" r="${f(width * 0.3)}" fill="${p.soft}"/>` +
      `<circle cx="${f(width * 0.04)}" cy="${f(height)}" r="${f(width * 0.36)}" fill="${p.soft}"/>` +
      `<circle cx="${f(width * 1.02)}" cy="${f(height * 0.94)}" r="${f(width * 0.34)}" fill="${p.accent}"/>` +
      `</g>`
    : "";

  const divider = `<g opacity="0.85"><line x1="${f(cx - width * 0.15)}" y1="${f(dividerY)}" x2="${f(cx - 11)}" y2="${f(dividerY)}" stroke="${p.accent}" stroke-width="1"/><line x1="${f(cx + 11)}" y1="${f(dividerY)}" x2="${f(cx + width * 0.15)}" y2="${f(dividerY)}" stroke="${p.accent}" stroke-width="1"/><rect x="${f(cx - 4)}" y="${f(dividerY - 4)}" width="8" height="8" fill="${p.accent}" transform="rotate(45 ${f(cx)} ${f(dividerY)})"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(label)} invitation cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${p.bg}"/>
      <stop offset="1" stop-color="${p.bg2}"/>
    </linearGradient>
    ${foilDefs("foil", p.accent)}
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="${p.bg}" stop-opacity="0"/>
      <stop offset="1" stop-color="${p.dark ? "#000" : p.accent}" stop-opacity="${p.dark ? 0.5 : 0.12}"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${bleed}
  <rect width="${width}" height="${height}" fill="url(#vig)"/>

  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${frameStroke}" stroke-width="${metallic ? 2 : 1.2}" opacity="${metallic ? 1 : 0.8}"/>
  <rect x="${inset + 7}" y="${inset + 7}" width="${width - (inset + 7) * 2}" height="${height - (inset + 7) * 2}" fill="none" stroke="${p.soft}" stroke-width="0.7" opacity="0.65"/>
  ${metallic ? corners(width, height, inset + 16, "url(#foil)", s) : ""}

  ${ornament}

  <text x="${f(cx)}" y="${f(eyebrowY)}" fill="${ink}" font-family="${sans}" font-size="${f(eyebrowSize)}" letter-spacing="${f(eyebrowSize * 0.28)}" text-anchor="middle" opacity="0.75">${escapeXml(family.eyebrow)}</text>
  <text x="${f(cx)}" y="${f(titleY)}" fill="${p.ink}" font-family="${serif}" font-size="${f(tSize)}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  ${divider}
  <text x="${f(cx)}" y="${f(categoryY)}" fill="${p.accent}" font-family="${sans}" font-size="${f(catSize)}" letter-spacing="${f(catSize * 0.3)}" text-anchor="middle" opacity="0.95">${escapeXml((caption ?? "Invitation").toUpperCase())}</text>
  ${below}
  <text x="${f(cx)}" y="${f(height * 0.945)}" fill="${ink}" font-family="${serif}" font-size="${f(width * 0.024)}" letter-spacing="${f(width * 0.006)}" text-anchor="middle" opacity="0.5">ML PRINTING</text>
</svg>`;
}

/** Canonical sizes per surface — Ph2.md §6 requires desktop, mobile, and print previews. */
export const PLACEHOLDER_SIZES = {
  cover: { width: 600, height: 750 },
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
  print: { width: 600, height: 850 },
} as const;

export type PlaceholderSurface = keyof typeof PLACEHOLDER_SIZES;

export function isPlaceholderSurface(
  value: string,
): value is PlaceholderSurface {
  return value in PLACEHOLDER_SIZES;
}

/** The URL a template row stores for generated artwork. */
export function placeholderUrl(
  surface: PlaceholderSurface,
  seed: string,
  label: string,
  caption?: string,
  style?: string,
): string {
  const params = new URLSearchParams({ label });
  if (caption) params.set("caption", caption);
  if (style) params.set("style", style);
  return `/api/placeholder/${surface}/${encodeURIComponent(seed)}?${params.toString()}`;
}
