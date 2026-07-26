import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding, routes } from "@/lib/config";

/**
 * The hero.
 *
 * The visual is a fanned stack of real covers from the catalogue, not stock
 * photography or an illustration of a product — this is the product. The page
 * chrome stays on the neutral design tokens so the artwork supplies all the
 * colour, and so the whole thing still works in dark mode.
 *
 * The primary action is the catalogue rather than sign-up: browsing needs no
 * account, and sending someone to a registration form before they have seen
 * anything is how a shop window loses people.
 */
export function LandingHero({
  covers,
  livePreviewSlug,
}: {
  /** Up to three cover images, front-most first. */
  covers: { src: string; alt: string }[];
  /** Template whose animated invitation the secondary action opens. */
  livePreviewSlug: string | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:gap-8 md:px-8 md:py-24">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            {branding.company} — Cebu
          </p>

          <h1 className="mt-5 text-balance font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Invitations your guests actually open.
          </h1>

          <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
            Send a link and a sealed envelope opens into your invitation —
            photos, countdown, directions, and RSVPs that come straight back to
            you. Printed to match, from our presses in Consolacion.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={routes.templates}>
                Browse templates
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>

            {livePreviewSlug ? (
              <Button asChild variant="outline" size="lg">
                <Link
                  href={routes.templateLivePreview(livePreviewSlug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PlayCircle aria-hidden="true" />
                  See a real invitation
                </Link>
              </Button>
            ) : null}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            No account needed to look around.
          </p>
        </div>

        {/* Decorative: the covers are shown for their design, and each one is
            reachable as a real template from the showcase below. */}
        {covers.length > 0 ? (
          <div
            className="relative mx-auto h-[340px] w-full max-w-sm sm:h-[420px]"
            aria-hidden="true"
          >
            {covers.slice(0, 3).map((cover, index) => (
              <div
                key={cover.src}
                className={[
                  "absolute left-1/2 top-1/2 aspect-[4/5] w-[62%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-muted shadow-xl",
                  index === 0
                    ? "z-30 rotate-[-3deg]"
                    : index === 1
                      ? "z-20 translate-x-[-90%] rotate-[-11deg]"
                      : "z-10 translate-x-[-10%] rotate-[8deg]",
                ].join(" ")}
              >
                <Image
                  src={cover.src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 20vw, 45vw"
                  // All three are above the fold and are the first thing the
                  // page is judged on. Lazy-loading them buys nothing and
                  // costs a visible pop-in on the hero.
                  priority
                  unoptimized={cover.src.startsWith("/api/placeholder/")}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
