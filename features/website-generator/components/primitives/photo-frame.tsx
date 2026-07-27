import { cn } from "@/lib/utils";

/**
 * A photograph in a shaped frame.
 *
 * Every photograph the platform renders today is a full-bleed rectangle, which
 * is the largest single gap named in docs/invitation-design-language.md: a
 * shaped frame is what makes a photograph read as placed rather than pasted.
 *
 * The shape is drawn on the wrapper, never on the image, so the image stays a
 * plain <img> with object-fit: cover. Swapping an illustration for a real
 * photograph later is then a change of `src` and nothing else, and no shape
 * needs an SVG mask or a second asset.
 */
export type PhotoShape = "oval" | "arch" | "circle" | "blob" | "rect";

/**
 * Only the two clip-paths and the blob's eight-value radius need a stylesheet;
 * they sit in the invitation primitives block in app/globals.css. The arch is a
 * radius Tailwind can already express, and "rect" is deliberately nothing — it
 * exists so a layout can opt out of shaping without rendering a different
 * element.
 */
const SHAPE_CLASS: Record<PhotoShape, string> = {
  oval: "inv-shape-oval",
  circle: "inv-shape-circle",
  blob: "inv-shape-blob",
  // A very large radius on the top two corners only. CSS scales adjacent radii
  // down until they fit the side, which lands at exactly half the width — a
  // true semicircle on top of a rectangle, at any size. A clip-path cannot say
  // this without being told the box's aspect ratio first.
  arch: "rounded-t-full",
  rect: "",
};

/**
 * Proportions that let a shape read as itself before a layout has said anything
 * about size. Merged through cn(), so a caller's own aspect-* class wins.
 */
const SHAPE_ASPECT: Record<PhotoShape, string> = {
  oval: "aspect-[4/5]",
  arch: "aspect-[4/5]",
  circle: "aspect-square",
  blob: "aspect-square",
  rect: "aspect-[4/3]",
};

export interface PhotoFrameProps {
  shape: PhotoShape;
  /**
   * Absent until a customer uploads something. The frame still draws, filled
   * with the theme's soft tone, so a layout can be judged before there is a
   * photograph to judge it with.
   */
  src?: string | null;
  /** Empty for a decorative photograph; the surrounding copy already names it. */
  alt: string;
  /** Above the fold. Loads eagerly instead of lazily. */
  priority?: boolean;
  /** A hairline in the theme accent, following the shape. */
  ring?: boolean;
  className?: string;
}

export function PhotoFrame({
  shape,
  src,
  alt,
  priority,
  ring,
  className,
}: PhotoFrameProps) {
  const shapeClass = SHAPE_CLASS[shape];

  return (
    // The ring is a padded backing plate rather than a border, because a border
    // sits inside the clip and a clip-path would eat half of it. Repeating the
    // shape on the inner element insets the same silhouette by a hairline, so
    // the rule follows an oval or a blob as faithfully as it follows a square.
    <div
      className={cn(
        "overflow-hidden",
        SHAPE_ASPECT[shape],
        shapeClass,
        ring && "p-px",
        className,
      )}
      style={ring ? { background: "var(--inv-accent)" } : undefined}
    >
      <div
        className={cn("size-full overflow-hidden", shapeClass)}
        style={{ background: "var(--inv-soft)" }}
      >
        {src ? (
          // A plain <img>: the src is a customer upload behind a short-lived
          // signed URL, which next/image would try to optimise and cache past
          // its expiry.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            className="block size-full object-cover"
          />
        ) : null}
      </div>
    </div>
  );
}
