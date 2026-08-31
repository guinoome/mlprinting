import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowRight } from "lucide-react";
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
}: {
  /** Up to three cover images, front-most first. */
  covers: { src: string; alt: string }[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#090711] text-white">
      <div className="pointer-events-none absolute -right-40 -top-52 size-[34rem] rounded-full bg-fuchsia-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 left-1/3 size-[30rem] rounded-full bg-cyan-400/10 blur-[110px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:gap-8 md:px-8 md:py-24">
        <div className="relative z-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            Interactive motion invitations · {branding.company}
          </p>

          <h1 className="mt-5 text-balance font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Choose an experience, not just a template.
          </h1>

          <p className="mt-5 max-w-lg text-pretty leading-relaxed text-white/70">
            Capiz light for a Filipino wedding. A neon pulse for an eighteenth.
            Quiet clarity for a tribute. Each invitation now has its own reveal,
            rhythm, and way of guiding guests.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-black hover:bg-white/90"
            >
              <Link href="#experience-proofs">
                Explore live experiences
                <ArrowDownRight aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={routes.acquisitionTemplates("home-hero")}>
                Browse catalogue
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Open all three live. No account needed.
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
                style={{ position: "absolute" }}
                className={[
                  "absolute left-1/2 top-1/2 aspect-[4/5] w-[62%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-2xl",
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
                  width={800}
                  height={1000}
                  sizes="(min-width: 768px) 20vw, 45vw"
                  // All three are above the fold and are the first thing the
                  // page is judged on. Lazy-loading them buys nothing and
                  // costs a visible pop-in on the hero.
                  priority
                  unoptimized={cover.src.startsWith("/api/placeholder/")}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
