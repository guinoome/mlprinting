import { cn } from "@/lib/utils";
import { PhotoFrame, type PhotoShape } from "./photo-frame";

/**
 * A row of small photographs near the foot of the page.
 *
 * The device earns its place because it uses photographs a customer already has
 * without competing with the hero — see docs/invitation-design-language.md. It
 * borrows PhotoFrame rather than clipping anything itself, so a strip picks up
 * every shape the frame learns.
 */

/**
 * Four across is where the references stop. A fifth makes each photograph too
 * small to be worth showing on a phone, so extra uploads are dropped here
 * rather than left to the layout to notice.
 */
const MAX_PHOTOS = 4;

export interface PhotoStripProps {
  photos: string[];
  shape?: PhotoShape;
  className?: string;
}

export function PhotoStrip({
  photos,
  shape = "rect",
  className,
}: PhotoStripProps) {
  const shown = photos.slice(0, MAX_PHOTOS);
  // Nothing at all rather than a row of empty frames: the placeholder fill is
  // there to judge a layout during design, not to advertise a missing upload to
  // a guest.
  if (shown.length === 0) return null;

  return (
    <div className={cn("flex items-start justify-center gap-3", className)}>
      {shown.map((src, index) => (
        <PhotoFrame
          // A customer can upload the same file twice, so the URL alone is not
          // a stable key.
          key={`${index}-${src}`}
          shape={shape}
          src={src}
          // Decorative: the invitation names the occasion in words a few
          // hundred pixels above, and reading four filenames aloud helps nobody.
          alt=""
          className="w-full max-w-[132px] flex-1"
        />
      ))}
    </div>
  );
}
