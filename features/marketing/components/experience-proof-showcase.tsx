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
  {
    slug: "ivory-lace",
    number: "05",
    name: "Ivory Lace",
    type: "Signature · Couture wedding",
    image: "/experiences/ivory-lace-hero.png",
    alt: "Filipina bride in a lace gown framed by warm botanical shadows",
    opening: "Lift the veil",
    story:
      "A translucent lace threshold lifts into an editorial ceremony, with measured pacing from vows to candlelit dinner and RSVP.",
    meta: ["MP-01 editorial", "M3 motion", "Couture print companion"],
  },
  {
    slug: "blush-botanical",
    number: "06",
    name: "Blush Botanical",
    type: "Signature · Garden wedding",
    image: "/experiences/blush-botanical-hero.png",
    alt: "Filipino wedding couple walking through a flowering garden arch",
    opening: "Enter the garden",
    story:
      "The garden blooms open before portraits, place, programme and vows flow through organic chapters shaped for the phone.",
    meta: ["MP-06 botanical", "M3 motion", "Portrait-led"],
  },
  {
    slug: "midnight-gold",
    number: "07",
    name: "Midnight Gold",
    type: "Signature · Black-tie wedding",
    image: "/experiences/midnight-gold-hero.png",
    alt: "Black-tie wedding couple beneath architectural bands of gold light",
    opening: "Part the night",
    story:
      "Architectural midnight panels part into a candlelit black-tie programme, venue and RSVP drawn in disciplined gold rules.",
    meta: ["MP-02 luxe reveal", "M3 motion", "Foil-ready"],
  },
  {
    slug: "starlight-pony-dreamscape",
    number: "08",
    name: "Starlight Pony Dreamscape",
    type: "Immersive · Children's birthday",
    image: "/experiences/starlight-pony-dreamscape-entry.webp",
    alt: "An illustrated toddler hugging a gentle unicorn beneath a moonlit castle",
    opening: "Begin the magic",
    story:
      "A customer-approved celebrant portrait becomes the heart of a moonlit birthday journey with live age, countdown, gallery, venue and RSVP.",
    meta: ["MP-storybook", "M3 motion", "Identity-safe portrait"],
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
            Every released experience earns its own opening, visual language,
            and guest journey. Eight are live now, with more joining the
            collection in deliberate releases as they pass interaction and
            visual QA.
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
              Editorial, memory-film, cultural ceremony and new digital-light
              families are already moving through the studio.
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
