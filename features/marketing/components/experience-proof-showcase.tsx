import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/config";

const LAUNCH = [
  {
    slug: "capiz-window",
    number: "01",
    name: "Capiz Window",
    type: "Signature · Filipino wedding",
    image: "/experiences/capiz-window-hero.png",
    alt: "Wedding couple in front of a luminous capiz installation",
    opening: "Open the light",
    story:
      "The guest enters through a luminous capiz threshold, then moves through ceremony, reception, map and RSVP as one editorial story.",
    meta: ["MP-14 cultural ceremony", "M3 motion", "Print companion"],
  },
  {
    slug: "neon-eighteen",
    number: "02",
    name: "Neon Eighteen",
    type: "Immersive · Debut nightlife",
    image: "/experiences/neon-eighteen-hero.png",
    alt: "Debutante on a violet and cyan live-event stage",
    opening: "Enter the night",
    story:
      "A live-event entrance gives way to a kinetic programme, countdown, dress code, optional soundtrack and a high-contrast RSVP.",
    meta: ["MP-09 neon pulse", "M4 motion", "Digital-first"],
  },
  {
    slug: "fiesta-banderitas",
    number: "03",
    name: "Fiesta Banderitas",
    type: "Signature · Filipino street fiesta",
    image: "/experiences/fiesta-banderitas-catalogue.png",
    alt: "Filipina festival host beneath colourful Cebuano banderitas",
    opening: "Join the fiesta",
    story:
      "The invitation behaves like a living street poster: banderitas, programme, route, countdown and RSVP move with the rhythm of a Cebuano fiesta.",
    meta: ["MP-10 live event", "M3 motion", "Filipino cultural"],
  },
  {
    slug: "product-launch",
    number: "04",
    name: "Product Launch",
    type: "Immersive · Corporate keynote",
    image: "/experiences/product-launch-catalogue.png",
    alt: "Pearlescent product reveal on an indigo keynote stage",
    opening: "Reveal the launch",
    story:
      "A liquid-light threshold opens into the proposition, countdown, keynote programme, venue and registration—built like a product reveal, not a memo.",
    meta: ["MP-11 product reveal", "M4 motion", "Screen-first"],
  },
] as const;

export function ExperienceProofShowcase() {
  return (
    <section id="experience-proofs" className="bg-[#f2eee5] text-[#171713]">
      <header className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-[1fr_0.7fr] md:px-8 md:py-28">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
            The launch collection
          </p>
          <h2 className="mt-5 max-w-3xl text-balance font-serif text-5xl leading-[0.96] tracking-[-0.04em] md:text-7xl">
            Fewer designs. Far more feeling.
          </h2>
        </div>
        <div className="self-end border-l border-black/20 pl-6">
          <p className="text-black/62 max-w-md text-sm leading-7">
            We release only experiences with a distinct opening, visual
            language, and guest journey. Four are live now, with more
            thoughtfully crafted experiences joining the collection through
            curated releases.
          </p>
        </div>
      </header>

      {LAUNCH.map((experience, index) => (
        <article
          key={experience.slug}
          className="group border-t border-black/15 px-5 py-8 md:px-8 md:py-12"
        >
          <div
            className={`mx-auto grid max-w-7xl overflow-hidden bg-[#0b0b0d] text-white lg:min-h-[76vh] lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,.75fr)] ${index % 2 ? "lg:[&>div:first-child]:order-2" : ""}`}
          >
            <div className="relative min-h-[52vh] overflow-hidden lg:min-h-full">
              <Image
                src={experience.image}
                alt={experience.alt}
                fill
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-[1.025] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/15" />
              <span className="absolute left-6 top-6 font-serif text-4xl text-white/80">
                {experience.number}
              </span>
            </div>

            <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#dfbd7e]">
                  {experience.type}
                </p>
                <h3 className="mt-5 font-serif text-5xl leading-none tracking-[-0.035em]">
                  {experience.name}
                </h3>
                <p className="text-white/64 mt-7 text-sm leading-7">
                  {experience.story}
                </p>
                <ul className="mt-8 space-y-3 border-t border-white/15 pt-6 text-[10px] uppercase tracking-[0.2em] text-white/55">
                  {experience.meta.map((item) => (
                    <li
                      key={item}
                      className="flex items-center justify-between gap-4"
                    >
                      {item}
                      <span aria-hidden="true">—</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={routes.templateLivePreview(experience.slug)}
                className="mt-12 inline-flex min-h-12 items-center justify-between border-b border-[#dfbd7e] pb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:text-[#dfbd7e] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {experience.opening}
                <ArrowUpRight className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>
      ))}

      <div className="border-t border-black/15 px-5 py-20 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
              In the studio
            </p>
            <p className="mt-4 max-w-3xl font-serif text-3xl leading-tight md:text-5xl">
              Editorial, memory-film, children, cultural ceremony and new
              digital-light families are already moving through the studio.
            </p>
          </div>
          <Link
            href={routes.templates}
            className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] underline decoration-black/25 underline-offset-8"
          >
            Browse current catalogue
          </Link>
        </div>
      </div>
    </section>
  );
}
