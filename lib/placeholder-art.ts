/**
 * Deterministic invitation cover art.
 *
 * ML Printing has not supplied real template photography yet, but the
 * marketplace is the storefront — basic placeholders lose customers. So this
 * generates elegant, category-specific invitation covers: same slug in, same
 * cover out, no files, no network, no upload path.
 *
 * Each category gets its own visual language — botanical for weddings, a laurel
 * wreath for debuts, art-deco for corporate — drawn as vectors so it renders
 * identically everywhere, paired with high-contrast serif typography. When real
 * artwork arrives it replaces `Template.coverImageUrl` and this module is
 * deleted rather than left to rot as a fallback nobody notices.
 *
 * Pure and framework-free: the route handler turns the string into a response;
 * this file has no idea a request exists.
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

/** Escape text for XML. The label is data; a quote in a name must not break the document. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Palette {
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
  soft: string;
  /** True for dark covers — the frame and eyebrow flip to the light ink. */
  dark?: boolean;
}

type Motif = "botanical" | "laurel" | "olive" | "confetti" | "deco" | "monogram";

interface Family {
  motif: Motif;
  eyebrow: string;
  palettes: Palette[];
}

/**
 * One visual language per category. Palettes are print-plausible and restrained;
 * the corporate family carries the single dark, dramatic cover on purpose — a
 * catalog of only pale covers reads as timid.
 */
const FAMILIES: Record<string, Family> = {
  wedding: {
    motif: "botanical",
    eyebrow: "TOGETHER WITH OUR FAMILIES",
    palettes: [
      { bg: "#faf6ef", bg2: "#f1e8d8", ink: "#4a4038", accent: "#b08d3c", soft: "#d8c79a" },
      { bg: "#fbf3f2", bg2: "#f2e2e2", ink: "#5a3f42", accent: "#c0868c", soft: "#e3c4c6" },
      { bg: "#f2f5f0", bg2: "#e3ece0", ink: "#3a453c", accent: "#7d977f", soft: "#bccdb8" },
      { bg: "#eef4f5", bg2: "#dce9eb", ink: "#33454b", accent: "#6f97a1", soft: "#b6ced2" },
    ],
  },
  debut: {
    motif: "laurel",
    eyebrow: "A DEBUT CELEBRATION",
    palettes: [
      { bg: "#fbf1ec", bg2: "#f2ded2", ink: "#5a3f3a", accent: "#bd8b6e", soft: "#e2c6ad" },
      { bg: "#f8f0ec", bg2: "#eaddd6", ink: "#4a2328", accent: "#8c2f39", soft: "#c9a227" },
    ],
  },
  anniversary: {
    motif: "laurel",
    eyebrow: "CELEBRATING YEARS TOGETHER",
    palettes: [
      { bg: "#faf5ea", bg2: "#f0e6cf", ink: "#4a4230", accent: "#b08d3c", soft: "#ddc78d" },
      { bg: "#f7efec", bg2: "#ecdcd6", ink: "#4a2328", accent: "#8c2f39", soft: "#cca77a" },
    ],
  },
  graduation: {
    motif: "laurel",
    eyebrow: "WITH PRIDE, WE INVITE YOU",
    palettes: [
      { bg: "#f1f3f7", bg2: "#dfe4ee", ink: "#2b3450", accent: "#b08d3c", soft: "#aab3cc" },
      { bg: "#f1f4ef", bg2: "#e0e8dd", ink: "#2f3a2f", accent: "#5a7a52", soft: "#adc4a4" },
    ],
  },
  christening: {
    motif: "olive",
    eyebrow: "WITH JOYFUL HEARTS",
    palettes: [
      { bg: "#f7f5ec", bg2: "#ebe8d5", ink: "#43452f", accent: "#8a8a55", soft: "#c6c69a" },
      { bg: "#f0f4f8", bg2: "#dde7f0", ink: "#33414a", accent: "#7d9bc0", soft: "#bcd2e4" },
    ],
  },
  birthday: {
    motif: "confetti",
    eyebrow: "PLEASE JOIN US",
    palettes: [
      { bg: "#fff5ef", bg2: "#ffe6d8", ink: "#5a3a30", accent: "#e2725b", soft: "#f2b8a3" },
      { bg: "#eff7f4", bg2: "#daeee7", ink: "#2f4a44", accent: "#4c9a8a", soft: "#a8d5c8" },
      { bg: "#f6f2fa", bg2: "#e8def4", ink: "#453852", accent: "#9a7bc0", soft: "#cbb8e2" },
    ],
  },
  corporate: {
    motif: "deco",
    eyebrow: "YOU ARE CORDIALLY INVITED",
    palettes: [
      { bg: "#1f2836", bg2: "#161d28", ink: "#f3ecdd", accent: "#c9a227", soft: "#6c7789", dark: true },
      { bg: "#f4f2ee", bg2: "#e7e3da", ink: "#2b2f38", accent: "#b08d3c", soft: "#b8b2a4" },
    ],
  },
  custom: {
    motif: "monogram",
    eyebrow: "AN INVITATION",
    palettes: [
      { bg: "#faf5ea", bg2: "#efe4cd", ink: "#41392c", accent: "#b08d3c", soft: "#dbc890" },
      { bg: "#f5f3f6", bg2: "#e7e2ea", ink: "#3d3648", accent: "#8f7bb0", soft: "#c9bcdc" },
    ],
  },
};

const FALLBACK: Family = FAMILIES.custom!;

/** A pointed leaf — two quadratic curves meeting at a tip. The unit of every botanical motif. */
function leaf(
  x: number,
  y: number,
  angle: number,
  len: number,
  fill: string,
  opacity = 1,
): string {
  const rad = (angle * Math.PI) / 180;
  const tx = x + Math.cos(rad) * len;
  const ty = y + Math.sin(rad) * len;
  const w = len * 0.32;
  const px = -Math.sin(rad) * w;
  const py = Math.cos(rad) * w;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(mx + px).toFixed(1)} ${(my + py).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q ${(mx - px).toFixed(1)} ${(my - py).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

/** A gently curved stem carrying alternating leaves — a eucalyptus sprig. */
function sprig(cx: number, cy: number, dir: number, scale: number, color: string): string {
  const parts: string[] = [];
  const steps = 5;
  parts.push(
    `<path d="M ${cx} ${cy} Q ${cx + dir * 34 * scale} ${cy - 30 * scale} ${cx + dir * 30 * scale} ${cy - 74 * scale}" fill="none" stroke="${color}" stroke-width="${1.4 * scale}" opacity="0.85"/>`,
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const sx = cx + dir * (34 * scale * t - 4 * scale * t * t * 4);
    const sy = cy - (30 * scale + 44 * scale * t) * t - 6;
    parts.push(leaf(sx, sy, dir > 0 ? -40 - i * 6 : -140 + i * 6, (18 - i * 1.6) * scale, color, 0.9));
    parts.push(leaf(sx, sy, dir > 0 ? -10 + i * 4 : -170 - i * 4, (15 - i * 1.4) * scale, color, 0.75));
  }
  return parts.join("");
}

/** Mirrored sprigs meeting toward the centre — a wedding crown. */
function botanical(cx: number, topY: number, w: number, p: Palette): string {
  const s = w / 600;
  return `<g>${sprig(cx - 6, topY, -1, s, p.accent)}${sprig(cx + 6, topY, 1, s, p.accent)}${sprig(cx - 4, topY + 4, -1, s * 0.7, p.soft)}${sprig(cx + 4, topY + 4, 1, s * 0.7, p.soft)}</g>`;
}

/**
 * Two leafy branches rising into an upward-opening cup, tied at the base — a
 * laurel wreath for debut, anniversary and graduation. Distinct from the
 * drooping eucalyptus of `botanical`: fuller leaves, upright and formal.
 */
function laurel(cx: number, cy: number, w: number, p: Palette): string {
  const s = w / 600;
  const branch = (side: number) => {
    const seg: string[] = [];
    const baseX = cx;
    const baseY = cy + 10 * s;
    const tipX = cx + side * 58 * s;
    const tipY = cy - 66 * s;
    const ctrlX = cx + side * 68 * s;
    const ctrlY = cy - 4 * s;
    seg.push(
      `<path d="M ${baseX} ${baseY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}" fill="none" stroke="${p.accent}" stroke-width="${1.5 * s}" opacity="0.85"/>`,
    );
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 0.4);
      const bx =
        (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * ctrlX + t * t * tipX;
      const by =
        (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * ctrlY + t * t * tipY;
      // Outer leaf points up-and-out along the branch; inner leaf fills toward centre.
      seg.push(leaf(bx, by, side > 0 ? -48 - i * 3 : -132 + i * 3, (23 - i * 1.5) * s, p.accent, 0.92));
      seg.push(leaf(bx, by, side > 0 ? -6 : -174, (15 - i) * s, p.soft, 0.7));
    }
    return seg.join("");
  };
  return `<g>${branch(-1)}${branch(1)}<circle cx="${cx}" cy="${(cy + 12 * s).toFixed(1)}" r="${3.4 * s}" fill="${p.accent}"/><circle cx="${(cx - 7 * s).toFixed(1)}" cy="${(cy + 17 * s).toFixed(1)}" r="${2.4 * s}" fill="${p.soft}"/><circle cx="${(cx + 7 * s).toFixed(1)}" cy="${(cy + 17 * s).toFixed(1)}" r="${2.4 * s}" fill="${p.soft}"/></g>`;
}

/** A single olive branch with paired leaves and a few berries — christening. */
function olive(cx: number, topY: number, w: number, p: Palette): string {
  const s = w / 600;
  const parts: string[] = [
    `<path d="M ${cx} ${topY} Q ${cx - 2} ${topY + 40 * s} ${cx} ${topY + 84 * s}" fill="none" stroke="${p.accent}" stroke-width="${1.4 * s}" opacity="0.85"/>`,
  ];
  for (let i = 0; i < 5; i++) {
    const y = topY + (12 + i * 16) * s;
    parts.push(leaf(cx, y, -30, (20 - i * 1.5) * s, p.accent, 0.9));
    parts.push(leaf(cx, y + 6 * s, 210, (20 - i * 1.5) * s, p.accent, 0.9));
  }
  parts.push(`<circle cx="${cx - 10 * s}" cy="${topY + 30 * s}" r="${3.4 * s}" fill="${p.soft}"/>`);
  parts.push(`<circle cx="${cx + 11 * s}" cy="${topY + 52 * s}" r="${3.4 * s}" fill="${p.soft}"/>`);
  return `<g>${parts.join("")}</g>`;
}

/** Scattered, sparse confetti — birthday. Deterministic placement from the seed. */
function confetti(cx: number, topY: number, w: number, p: Palette, h: number): string {
  const parts: string[] = [];
  const colors = [p.accent, p.soft, p.ink];
  for (let i = 0; i < 16; i++) {
    const r1 = ((h >> (i % 24)) & 0xff) / 255;
    const r2 = ((hash(`c${i}`) >> 4) & 0xff) / 255;
    const x = cx + (r1 - 0.5) * w * 0.72;
    const y = topY + r2 * w * 0.22;
    const c = colors[i % 3]!;
    if (i % 3 === 0)
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + r1 * 3).toFixed(1)}" fill="${c}" opacity="0.8"/>`);
    else
      parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(4 + r2 * 4).toFixed(1)}" height="${(4 + r2 * 4).toFixed(1)}" fill="${c}" opacity="0.75" transform="rotate(${(r1 * 60).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }
  return `<g>${parts.join("")}</g>`;
}

/** A radiating sunburst fan and stepped arcs — art-deco, corporate. */
function deco(cx: number, cy: number, w: number, p: Palette): string {
  const s = w / 600;
  const rays: string[] = [];
  for (let i = -5; i <= 5; i++) {
    const a = (-90 + i * 9) * (Math.PI / 180);
    const len = (46 - Math.abs(i) * 2) * s;
    rays.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * len).toFixed(1)}" y2="${(cy + Math.sin(a) * len).toFixed(1)}" stroke="${p.accent}" stroke-width="${1.2 * s}" opacity="0.9"/>`);
  }
  return `<g>${rays.join("")}<path d="M ${cx - 54 * s} ${cy} A ${54 * s} ${54 * s} 0 0 1 ${cx + 54 * s} ${cy}" fill="none" stroke="${p.accent}" stroke-width="${1.4 * s}" opacity="0.8"/><path d="M ${cx - 40 * s} ${cy} A ${40 * s} ${40 * s} 0 0 1 ${cx + 40 * s} ${cy}" fill="none" stroke="${p.soft}" stroke-width="${1 * s}" opacity="0.7"/><circle cx="${cx}" cy="${cy}" r="${3 * s}" fill="${p.accent}"/></g>`;
}

/** An initial inside a thin ring with small flourishes — custom / fallback. */
function monogram(cx: number, cy: number, w: number, p: Palette, glyph: string): string {
  const s = w / 600;
  const r = 52 * s;
  return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="${1.3 * s}" opacity="0.85"/><circle cx="${cx}" cy="${cy}" r="${r - 6 * s}" fill="none" stroke="${p.soft}" stroke-width="${0.8 * s}" opacity="0.7"/><text x="${cx}" y="${cy}" fill="${p.accent}" font-family="Didot, 'Bodoni MT', Georgia, serif" font-size="${58 * s}" text-anchor="middle" dominant-baseline="central">${glyph}</text><line x1="${cx - r - 14 * s}" y1="${cy}" x2="${cx - r - 4 * s}" y2="${cy}" stroke="${p.accent}" stroke-width="${1 * s}" opacity="0.6"/><line x1="${cx + r + 4 * s}" y1="${cy}" x2="${cx + r + 14 * s}" y2="${cy}" stroke="${p.accent}" stroke-width="${1 * s}" opacity="0.6"/></g>`;
}

/** A hairline divider with a small centred diamond — the quiet ornament between title and category. */
function divider(cx: number, cy: number, w: number, p: Palette): string {
  const half = w * 0.16;
  const d = 4;
  return `<g opacity="0.8"><line x1="${cx - half}" y1="${cy}" x2="${cx - 10}" y2="${cy}" stroke="${p.accent}" stroke-width="1"/><line x1="${cx + 10}" y1="${cy}" x2="${cx + half}" y2="${cy}" stroke="${p.accent}" stroke-width="1"/><rect x="${cx - d}" y="${cy - d}" width="${d * 2}" height="${d * 2}" fill="${p.accent}" transform="rotate(45 ${cx} ${cy})"/></g>`;
}

export interface PlaceholderOptions {
  seed: string;
  label: string;
  /** Category name, e.g. "Wedding" — chooses the visual family. */
  caption?: string;
  width: number;
  height: number;
}

function motifFor(
  motif: Motif,
  cx: number,
  topY: number,
  w: number,
  p: Palette,
  glyph: string,
  h: number,
): string {
  switch (motif) {
    case "botanical":
      return botanical(cx, topY + 74 * (w / 600), w, p);
    case "laurel":
      return laurel(cx, topY + 60 * (w / 600), w, p);
    case "olive":
      return olive(cx, topY, w, p);
    case "confetti":
      return confetti(cx, topY, w, p, h);
    case "deco":
      return deco(cx, topY + 54 * (w / 600), w, p);
    case "monogram":
      return monogram(cx, topY + 54 * (w / 600), w, p, glyph);
  }
}

/** Fit the title to the card: shrink for long names so a two-word title never clips the frame. */
function titleSize(label: string, w: number): number {
  const base = w * 0.092;
  const over = Math.max(0, label.length - 10);
  return Math.max(w * 0.05, base - over * (w * 0.0032));
}

type FigureKind = "gown" | "suit" | "toga";

/**
 * A faceless human silhouette seen from behind — a person "sample" for the
 * cover that is no one's likeness, so a model release is never in question.
 * Built from primitives and filled flat, tinted from the palette so it reads as
 * a soft presence, not clip art.
 */
function personBack(
  cx: number,
  groundY: number,
  h: number,
  kind: FigureKind,
  color: string,
  opacity: number,
): string {
  const f = (n: number) => n.toFixed(1);
  const headR = h * 0.058;
  const headCy = groundY - h * 0.9;
  const shoulderY = groundY - h * 0.77;
  const robe = kind === "gown" || kind === "toga";
  const parts: string[] = [];

  if (kind === "gown") {
    // The veil trails behind, drawn first so the gown sits over it.
    const vHem = h * 0.19;
    parts.push(
      `<path d="M ${f(cx - headR)} ${f(headCy)} Q ${f(cx - headR * 2.4)} ${f((headCy + groundY) / 2)} ${f(cx - vHem)} ${f(groundY)} L ${f(cx + vHem)} ${f(groundY)} Q ${f(cx + headR * 2.4)} ${f((headCy + groundY) / 2)} ${f(cx + headR)} ${f(headCy)} Z" fill="${color}" opacity="${(opacity * 0.35).toFixed(2)}"/>`,
    );
  }

  // Head and a short tapered neck into the shoulders.
  parts.push(
    `<circle cx="${f(cx)}" cy="${f(headCy)}" r="${f(headR)}" fill="${color}" opacity="${opacity}"/>`,
  );
  parts.push(
    `<path d="M ${f(cx - headR * 0.55)} ${f(headCy + headR * 0.45)} L ${f(cx + headR * 0.55)} ${f(headCy + headR * 0.45)} L ${f(cx + headR * 0.7)} ${f(shoulderY)} L ${f(cx - headR * 0.7)} ${f(shoulderY)} Z" fill="${color}" opacity="${opacity}"/>`,
  );

  if (robe) {
    // Shoulders taper to a waist, then flare to the hem — a gown or a graduate's robe.
    const shoulderHalf = h * 0.11;
    const waistHalf = h * 0.088;
    const hemHalf = h * 0.23;
    const waistY = shoulderY + h * 0.2;
    parts.push(
      `<path d="M ${f(cx - shoulderHalf)} ${f(shoulderY)} Q ${f(cx - shoulderHalf * 0.85)} ${f(shoulderY + h * 0.1)} ${f(cx - waistHalf)} ${f(waistY)} L ${f(cx - hemHalf)} ${f(groundY)} L ${f(cx + hemHalf)} ${f(groundY)} L ${f(cx + waistHalf)} ${f(waistY)} Q ${f(cx + shoulderHalf * 0.85)} ${f(shoulderY + h * 0.1)} ${f(cx + shoulderHalf)} ${f(shoulderY)} Q ${f(cx)} ${f(shoulderY - h * 0.025)} ${f(cx - shoulderHalf)} ${f(shoulderY)} Z" fill="${color}" opacity="${opacity}"/>`,
    );
  } else {
    // A torso to the hips, then two legs — clearly a suit, not a dress.
    const shoulderHalf = h * 0.125;
    const hipHalf = h * 0.093;
    const torsoBottom = groundY - h * 0.42;
    const legW = hipHalf * 0.78;
    parts.push(
      `<path d="M ${f(cx - shoulderHalf)} ${f(shoulderY)} Q ${f(cx - shoulderHalf * 0.9)} ${f(shoulderY + h * 0.2)} ${f(cx - hipHalf)} ${f(torsoBottom)} L ${f(cx + hipHalf)} ${f(torsoBottom)} Q ${f(cx + shoulderHalf * 0.9)} ${f(shoulderY + h * 0.2)} ${f(cx + shoulderHalf)} ${f(shoulderY)} Q ${f(cx)} ${f(shoulderY - h * 0.025)} ${f(cx - shoulderHalf)} ${f(shoulderY)} Z" fill="${color}" opacity="${opacity}"/>`,
    );
    parts.push(
      `<rect x="${f(cx - hipHalf)}" y="${f(torsoBottom - 1)}" width="${f(legW)}" height="${f(groundY - torsoBottom + 1)}" fill="${color}" opacity="${opacity}"/>`,
    );
    parts.push(
      `<rect x="${f(cx + hipHalf - legW)}" y="${f(torsoBottom - 1)}" width="${f(legW)}" height="${f(groundY - torsoBottom + 1)}" fill="${color}" opacity="${opacity}"/>`,
    );
  }

  if (kind === "toga") {
    const capY = headCy - headR * 1.0;
    const capW = headR * 2.4;
    parts.push(
      `<path d="M ${f(cx - capW)} ${f(capY)} L ${f(cx)} ${f(capY - headR * 0.55)} L ${f(cx + capW)} ${f(capY)} L ${f(cx)} ${f(capY + headR * 0.55)} Z" fill="${color}" opacity="${opacity}"/>`,
    );
    parts.push(
      `<line x1="${f(cx + capW * 0.5)}" y1="${f(capY)}" x2="${f(cx + capW * 0.5)}" y2="${f(capY + headR * 1.8)}" stroke="${color}" stroke-width="${(h * 0.007).toFixed(2)}" opacity="${opacity}"/>`,
    );
    parts.push(
      `<circle cx="${f(cx + capW * 0.5)}" cy="${f(capY + headR * 1.9)}" r="${f(headR * 0.22)}" fill="${color}" opacity="${opacity}"/>`,
    );
  }
  return parts.join("");
}

/** The silhouette scene for a category, or "" for the abstract-motif families. */
function figureFor(key: string, cx: number, height: number, p: Palette): string {
  const groundY = height * 0.92;
  const fh = height * 0.4;
  const color = p.accent;
  const op = 0.5;
  switch (key) {
    case "wedding":
    case "anniversary": {
      const off = fh * 0.13;
      return `<g>${personBack(cx - off, groundY, fh, "gown", color, op)}${personBack(cx + off, groundY, fh, "suit", color, op)}</g>`;
    }
    case "debut":
      return `<g>${personBack(cx, groundY, fh * 1.05, "gown", color, op)}</g>`;
    case "graduation":
      return `<g>${personBack(cx, groundY, fh, "toga", color, op)}</g>`;
    case "christening": {
      const parent = personBack(cx, groundY, fh, "gown", color, op);
      // A small bundle cradled at the chest, back view — no baby's face either.
      const bundle = `<ellipse cx="${(cx + fh * 0.04).toFixed(1)}" cy="${(groundY - fh * 0.6).toFixed(1)}" rx="${(fh * 0.06).toFixed(1)}" ry="${(fh * 0.045).toFixed(1)}" fill="${color}" opacity="${(op * 1.25).toFixed(2)}"/>`;
      return `<g>${parent}${bundle}</g>`;
    }
    default:
      return "";
  }
}

/**
 * An elegant invitation cover.
 *
 * SVG rather than a raster: a few hundred bytes, scales to any card size, needs
 * no image pipeline, and is served with an immutable cache header — the cost is
 * paid once. The vector motifs render identically everywhere; only the type
 * leans on the viewer's serif, which every platform has.
 */
export function placeholderCover({
  seed,
  label,
  caption,
  width,
  height,
}: PlaceholderOptions): string {
  const h = hash(seed);
  const key = (caption ?? "").trim().toLowerCase();
  const family = FAMILIES[key] ?? FALLBACK;
  const p = family.palettes[h % family.palettes.length]!;

  const cx = width / 2;
  const frameInset = Math.round(width * 0.065);
  const frameColor = p.dark ? p.soft : p.accent;
  const first = label.trim()[0];
  const glyph = first ? escapeXml(first.toUpperCase()) : "·";

  const tSize = titleSize(label, width);
  const eyebrowSize = Math.max(8, width * 0.0205);
  const catSize = Math.max(8, width * 0.019);

  const serif = "Didot, 'Bodoni MT', 'Hoefler Text', Georgia, 'Times New Roman', serif";
  const sans = "'Gill Sans', 'Century Gothic', 'Futura', 'Segoe UI', system-ui, sans-serif";

  // A faceless silhouette grounds the categories where a person is expected and
  // takes the lower third; the type then moves up and stands in for the motif.
  const figure = p.dark ? "" : figureFor(key, cx, height, p);
  const hasFigure = figure !== "";
  const ink = p.dark ? p.soft : p.ink;

  const eyebrowY = height * (hasFigure ? 0.26 : 0.4);
  const titleY = height * (hasFigure ? 0.36 : 0.5);
  const dividerY = hasFigure ? height * 0.43 : height * 0.585;
  const categoryY = height * (hasFigure ? 0.475 : 0.645);

  const topMotif = hasFigure
    ? figure
    : motifFor(family.motif, cx, height * 0.17, width * 1.15, p, glyph, h);
  const footer = hasFigure
    ? ""
    : `<text x="${cx}" y="${height * 0.9}" fill="${ink}" font-family="${serif}" font-size="${width * 0.026}" letter-spacing="${width * 0.006}" text-anchor="middle" opacity="0.55">ML PRINTING</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(label)} invitation cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.bg}"/>
      <stop offset="1" stop-color="${p.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="${frameInset}" y="${frameInset}" width="${width - frameInset * 2}" height="${height - frameInset * 2}" fill="none" stroke="${frameColor}" stroke-width="1.25" opacity="0.75"/>
  <rect x="${frameInset + 6}" y="${frameInset + 6}" width="${width - (frameInset + 6) * 2}" height="${height - (frameInset + 6) * 2}" fill="none" stroke="${frameColor}" stroke-width="0.6" opacity="0.45"/>
  ${topMotif}
  <text x="${cx}" y="${eyebrowY}" fill="${ink}" font-family="${sans}" font-size="${eyebrowSize}" letter-spacing="${eyebrowSize * 0.28}" text-anchor="middle" opacity="0.72">${escapeXml(family.eyebrow)}</text>
  <text x="${cx}" y="${titleY}" fill="${p.ink}" font-family="${serif}" font-size="${tSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  ${divider(cx, dividerY, width, p)}
  <text x="${cx}" y="${categoryY}" fill="${p.accent}" font-family="${sans}" font-size="${catSize}" letter-spacing="${catSize * 0.3}" text-anchor="middle" opacity="0.9">${escapeXml((caption ?? "Invitation").toUpperCase())}</text>
  ${footer}
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
): string {
  const params = new URLSearchParams({ label });
  if (caption) params.set("caption", caption);
  return `/api/placeholder/${surface}/${encodeURIComponent(seed)}?${params.toString()}`;
}
