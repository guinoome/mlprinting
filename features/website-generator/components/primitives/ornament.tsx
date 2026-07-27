import { cn } from "@/lib/utils";

/**
 * Corner decoration and the inset rule frame.
 *
 * docs/invitation-design-language.md records that the references gather their
 * florals, filigree and washes at the corners and leave the middle clear for
 * words, and that our own covers get this wrong by centring their ornament. So
 * these are corner-anchored by construction: there is no way to ask for one in
 * the middle.
 *
 * Every motif draws in currentColor or the theme's own soft tone. Nothing here
 * carries a hex value, because an ornament sits inside a palette the customer
 * picked and a fixed gold would fight half of them.
 */
export type OrnamentPlacement =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type OrnamentMotif = "floral" | "filigree" | "wash" | "confetti";

/**
 * Each motif is drawn once, anchored to the top-left, and reflected into the
 * other three corners. Reflection is right where placement is concerned — it
 * keeps the growth direction pointing into the card — and wrong where the
 * motifs themselves are concerned, which is why no two of them below are the
 * same shape at a different angle.
 */
const PLACEMENT_CLASS: Record<OrnamentPlacement, string> = {
  "top-left": "left-0 top-0",
  "top-right": "right-0 top-0 -scale-x-100",
  "bottom-left": "bottom-0 left-0 -scale-y-100",
  "bottom-right": "bottom-0 right-0 -scale-x-100 -scale-y-100",
};

const PETAL_ANGLES = [0, 72, 144, 216, 288];

/** A five-petal rosette, used by the floral motif. */
function Bloom({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {PETAL_ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx={0}
          cy={-r * 0.62}
          rx={r * 0.4}
          ry={r * 0.62}
          transform={`rotate(${angle})`}
          opacity={0.85}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.28} />
    </g>
  );
}

/** A pointed leaf, positioned and angled along a stem. */
function Leaf({
  x,
  y,
  angle,
  size,
}: {
  x: number;
  y: number;
  angle: number;
  size: number;
}) {
  return (
    <path
      d="M0 0C4-4 10-4 14 0 10 4 4 4 0 0Z"
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}
      opacity={0.7}
    />
  );
}

/** Stems out of the corner, leaves along them, blooms at the ends. */
function FloralMotif() {
  return (
    <>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.75}
      >
        <path d="M3 5C25 11 43 25 57 45" />
        <path d="M3 5C9 26 13 48 15 71" />
        <path d="M3 5C25 9 47 11 69 13" />
      </g>
      <g fill="currentColor">
        <Leaf x={18} y={12} angle={28} size={0.85} />
        <Leaf x={34} y={23} angle={40} size={0.7} />
        <Leaf x={9} y={26} angle={78} size={0.8} />
        <Leaf x={13} y={48} angle={86} size={0.65} />
        <Leaf x={30} y={9} angle={-8} size={0.7} />
        <Leaf x={52} y={11} angle={4} size={0.6} />
        <Bloom cx={60} cy={48} r={8} />
        <Bloom cx={17} cy={74} r={6.5} />
        <Bloom cx={72} cy={13} r={5.5} />
      </g>
    </>
  );
}

/** Scrollwork: line only, symmetric about the diagonal, each stroke ending in a curl. */
function FiligreeMotif() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={0.9}
      strokeLinecap="round"
      opacity={0.85}
    >
      <path d="M2 24C2 11 11 2 24 2" />
      <path d="M0 48C21 45 35 33 41 15 44 6 51 1 59 3c8 2 10 12 4 17-5 4-12 2-13-4" />
      <path d="M48 0C45 21 33 35 15 41 6 44 1 51 3 59c2 8 12 10 17 4 4-5 2-12-4-13" />
      <path d="M26 26c6 0 11 5 11 11" />
      <path d="M12 8c9 1 16 4 22 9" />
      <path d="M8 12c1 9 4 16 9 22" />
    </g>
  );
}

/** Watercolour: soft flooded shapes with no outline at all. */
function WashMotif() {
  return (
    <g stroke="none">
      <path
        d="M0 0H82C74 24 52 40 26 49 13 53 4 62 0 74Z"
        fill="var(--inv-soft)"
        opacity={0.85}
      />
      <path
        d="M0 0H46C42 19 27 32 11 38 5 41 0 45 0 50Z"
        fill="currentColor"
        opacity={0.22}
      />
      <path
        d="M62 34c9-3 17 2 16 9-1 8-11 12-18 8-6-3-6-14 2-17Z"
        fill="currentColor"
        opacity={0.14}
      />
      <path
        d="M26 62c7-2 12 3 10 9-2 6-10 8-14 4-4-4-2-11 4-13Z"
        fill="var(--inv-soft)"
        opacity={0.6}
      />
    </g>
  );
}

/** Scattered pieces, dense at the corner and thinning out — deliberately loud. */
const CONFETTI_PIECES = [
  { x: 8, y: 6, w: 9, h: 3.5, angle: 22 },
  { x: 26, y: 14, w: 7, h: 3, angle: -34 },
  { x: 46, y: 6, w: 8, h: 3, angle: 12 },
  { x: 12, y: 30, w: 6.5, h: 3, angle: 64 },
  { x: 34, y: 40, w: 8, h: 3, angle: -18 },
  { x: 6, y: 52, w: 7, h: 3, angle: 40 },
  { x: 60, y: 26, w: 6, h: 2.5, angle: -52 },
  { x: 20, y: 66, w: 6, h: 2.5, angle: 8 },
];

const CONFETTI_DOTS = [
  { cx: 22, cy: 4, r: 2.4 },
  { cx: 40, cy: 24, r: 3 },
  { cx: 58, cy: 12, r: 2 },
  { cx: 8, cy: 42, r: 2.6 },
  { cx: 30, cy: 55, r: 2.2 },
  { cx: 72, cy: 34, r: 2 },
  { cx: 46, cy: 70, r: 2.4 },
];

function ConfettiMotif() {
  return (
    <>
      <g fill="currentColor">
        {CONFETTI_PIECES.map((piece) => (
          <rect
            key={`${piece.x}-${piece.y}`}
            x={piece.x}
            y={piece.y}
            width={piece.w}
            height={piece.h}
            rx={1.2}
            transform={`rotate(${piece.angle} ${piece.x + piece.w / 2} ${piece.y + piece.h / 2})`}
            opacity={0.8}
          />
        ))}
      </g>
      <g fill="var(--inv-soft)">
        {CONFETTI_DOTS.map((dot) => (
          <circle key={`${dot.cx}-${dot.cy}`} {...dot} />
        ))}
      </g>
      <g fill="currentColor" opacity={0.55}>
        <path d="M52 46l6 4-7 3Z" />
        <path d="M16 18l5 5-6 2Z" />
      </g>
    </>
  );
}

const MOTIF: Record<OrnamentMotif, () => React.ReactElement> = {
  floral: FloralMotif,
  filigree: FiligreeMotif,
  wash: WashMotif,
  confetti: ConfettiMotif,
};

export interface CornerOrnamentProps {
  placement: OrnamentPlacement;
  motif: OrnamentMotif;
  className?: string;
}

/** Positioned absolutely, so whatever holds it needs to be a positioned box. */
export function CornerOrnament({
  placement,
  motif,
  className,
}: CornerOrnamentProps) {
  const Motif = MOTIF[motif];

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn(
        "pointer-events-none absolute size-[clamp(76px,15vw,148px)]",
        PLACEMENT_CLASS[placement],
        className,
      )}
      // One declaration sets the hue of every stroke and fill in the motif,
      // since the drawings key off currentColor.
      style={{ color: "var(--inv-accent)" }}
    >
      <Motif />
    </svg>
  );
}

export interface InsetFrameProps {
  /** A second rule just inside the first, which is what most of the references do. */
  double?: boolean;
  className?: string;
}

/**
 * A hairline rectangle set in from the trim. Cheap, and it does a great deal of
 * the work that otherwise needs artwork.
 */
export function InsetFrame({ double, className }: InsetFrameProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-[clamp(12px,2.6vw,24px)] border",
        className,
      )}
      style={{ borderColor: "var(--inv-line)" }}
    >
      {double ? (
        <div
          className="absolute inset-[5px] border"
          style={{ borderColor: "var(--inv-line)" }}
        />
      ) : null}
    </div>
  );
}
