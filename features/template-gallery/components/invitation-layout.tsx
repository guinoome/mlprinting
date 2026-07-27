import { cn } from "@/lib/utils";
import type { InvitationContent, Template } from "../types";

/**
 * The renderer every template shares.
 *
 * One text hierarchy — eyebrow, headline, subheadline, body, footer — so a
 * customer can change design without their words re-flowing into a different
 * structure. That is the promise a gallery makes by letting people swap
 * templates at all, and it only holds if no template invents its own slots.
 *
 * Two backgrounds, chosen by style rather than by a separate flag: a
 * photographic design fills the canvas and needs a scrim under the type, while
 * a flat or illustrated one tints from the palette and needs none. Both take
 * the same content.
 */
export function InvitationLayout({
  template,
  content,
  className,
}: {
  template: Template;
  content: InvitationContent;
  className?: string;
}) {
  const [base, accent, ink] = template.colorPalette;
  const photo = template.style === "photographic";

  return (
    <article
      className={cn(
        "relative isolate flex flex-col justify-end overflow-hidden rounded-xl",
        template.orientation === "square" ? "aspect-square" : "aspect-[4/5]",
        className,
      )}
      style={{ backgroundColor: base }}
    >
      {photo ? (
        <>
          {/* Stands in for the customer's uploaded photograph. */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(150deg, ${accent} 0%, ${ink} 100%)`,
            }}
          />
          {/* Without a scrim, light type over a photograph is a coin toss. The
              gradient is heaviest exactly where the text sits. */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,12,14,0.22) 0%, rgba(15,12,14,0.05) 42%, rgba(15,12,14,0.72) 100%)",
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(165deg, ${base} 0%, ${accent}44 100%)`,
            }}
          />
          {/* Decorative wash. Purely atmospheric, so it is hidden from
              assistive technology rather than described. */}
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 -z-10 size-40 rounded-full opacity-25"
            style={{ backgroundColor: accent }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-16 -left-12 -z-10 size-48 rounded-full opacity-20"
            style={{ backgroundColor: accent }}
          />
        </>
      )}

      <div
        className="flex flex-col gap-3 p-6 text-center sm:p-8"
        style={{ color: photo ? "#fff" : ink }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] opacity-80">
          {content.eyebrow}
        </p>

        <h3 className="font-serif text-3xl leading-[1.05] sm:text-4xl">
          {content.headline}
        </h3>

        <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-90">
          {content.subheadline}
        </p>

        <span
          aria-hidden="true"
          className="mx-auto h-px w-10 opacity-50"
          style={{ backgroundColor: photo ? "#fff" : accent }}
        />

        <p className="whitespace-pre-line text-sm leading-relaxed opacity-85">
          {content.body}
        </p>

        <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">
          {content.footer}
        </p>
      </div>
    </article>
  );
}

/** Stand-in wording, so a preview is never an empty frame. */
export const SAMPLE_CONTENT: InvitationContent = {
  eyebrow: "Join us for",
  headline: "Maria & Jose",
  subheadline: "Saturday, 14 February · 3:00 PM",
  body: "Santo Niño Basilica\nOsmeña Blvd, Cebu City",
  footer: "RSVP by 20 January",
};
