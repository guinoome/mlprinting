import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/config";

type ExperiencePortal = {
  number: string;
  label: string;
  note: string;
  image: string;
  imageAlt: string;
  href?: string;
  position?: string;
  desktopHeight: string;
};

const EXPERIENCE_PORTALS: readonly ExperiencePortal[] = [
  {
    number: "01",
    label: "Wedding",
    note: "Four live journeys",
    image: "/experiences/capiz-window-hero.png",
    imageAlt: "Filipino wedding couple framed by luminous capiz panels",
    href: `${routes.templates}?category=wedding`,
    position: "58% center",
    desktopHeight: "md:h-[25rem] lg:h-[32rem]",
  },
  {
    number: "02",
    label: "Debut nightlife",
    note: "Enter Neon Eighteen",
    image: "/experiences/neon-eighteen-hero.png",
    imageAlt: "Debutante entering a neon nightlife celebration",
    href: `${routes.templates}?category=debut`,
    position: "72% center",
    desktopHeight: "md:h-[28rem] lg:h-[36rem]",
  },
  {
    number: "03",
    label: "Filipino cultural",
    note: "Join the fiesta",
    image: "/experiences/fiesta-banderitas-catalogue.png",
    imageAlt: "Colourful Filipino banderitas above a festival portrait",
    href: `${routes.templates}?category=fiesta`,
    position: "50% center",
    desktopHeight: "md:h-[26rem] lg:h-[34rem]",
  },
  {
    number: "04",
    label: "Memorial",
    note: "A quiet tribute",
    image: "/experiences/memorial-sampaguita-portal.png",
    imageAlt: "Restrained white floral memorial composition",
    href: routes.templateLivePreview("in-loving-memory"),
    position: "center",
    desktopHeight: "md:h-[24rem] lg:h-[31rem]",
  },
  {
    number: "05",
    label: "Children",
    note: "Enter the dreamscape",
    image: "/experiences/starlight-pony-dreamscape-catalogue.webp",
    imageAlt: "A luminous starlight pony dreamscape for a children's birthday",
    href: routes.templateLivePreview("starlight-pony-dreamscape"),
    position: "center",
    desktopHeight: "md:h-[27rem] lg:h-[35rem]",
  },
  {
    number: "06",
    label: "Corporate launch",
    note: "Reveal the launch",
    image: "/experiences/product-launch-catalogue.png",
    imageAlt: "Pearlescent product revealed on an indigo stage",
    href: `${routes.templates}?category=corporate`,
    position: "center",
    desktopHeight: "md:h-[29rem] lg:h-[37rem]",
  },
  {
    number: "07",
    label: "Live event",
    note: "Explore live energy",
    image: "/experiences/fiesta-banderitas-hero.png",
    imageAlt: "Live celebration filled with colour and movement",
    href: routes.templateLivePreview("fiesta-banderitas"),
    position: "54% center",
    desktopHeight: "md:h-[26rem] lg:h-[34rem]",
  },
] as const;

function PortalArtwork({ portal }: { portal: ExperiencePortal }) {
  return (
    <>
      <Image
        src={portal.image}
        alt={portal.imageAlt}
        fill
        priority={portal.number === "01"}
        sizes="(min-width: 1024px) 15vw, (min-width: 640px) 32vw, 68vw"
        className="object-cover transition duration-700 group-hover:scale-[1.035] group-focus-visible:scale-[1.035] motion-reduce:transition-none"
        style={{ objectPosition: portal.position }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
      <span className="absolute left-4 top-7 text-[9px] font-semibold tracking-[0.24em] text-white/65">
        {portal.number}
      </span>
      <span className="absolute inset-x-4 bottom-5 text-white">
        <span className="block max-w-[10rem] font-serif text-[1.65rem] leading-[0.92] tracking-[-0.035em] sm:text-3xl lg:text-[clamp(1.25rem,2vw,2rem)]">
          {portal.label}
        </span>
        <span className="text-white/72 mt-3 flex items-end justify-between gap-2 border-t border-white/35 pt-3 text-[8px] font-semibold uppercase tracking-[0.17em]">
          {portal.note}
          {portal.href ? (
            <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <span className="rounded-full border border-white/40 px-2 py-1 text-[7px]">
              Soon
            </span>
          )}
        </span>
      </span>
    </>
  );
}

export function ExperienceFinder() {
  return (
    <section
      id="find-your-experience"
      aria-labelledby="experience-finder-title"
      className="scroll-mt-16 overflow-hidden bg-[#f5f0e7] text-[#181714] md:scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-16 md:px-8 md:pb-10 md:pt-24">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
              Seven ways to begin
            </p>
            <h2
              id="experience-finder-title"
              className="mt-4 max-w-xl font-serif text-4xl leading-[0.92] tracking-[-0.04em] sm:text-5xl md:text-6xl"
            >
              Find your experience.
            </h2>
          </div>
          <p className="text-black/58 max-w-xs text-sm leading-6 md:text-right">
            Different occasions deserve different entrances. Choose a world,
            then open the invitation it becomes.
          </p>
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-black/15 pt-4 text-[9px] font-semibold uppercase tracking-[0.2em] text-black/50 md:hidden">
          <span>Swipe to explore</span>
          <span aria-hidden="true">01 — 07</span>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] pb-16 md:px-8 md:pb-24">
        <div className="experience-finder-rail flex snap-x snap-mandatory items-end gap-2 overflow-x-auto px-5 pb-4 md:grid md:grid-cols-7 md:gap-1 md:overflow-visible md:px-0 md:pb-0">
          {EXPERIENCE_PORTALS.map((portal) => {
            const portalClass = `group relative block aspect-[0.62] w-[68vw] max-w-[17rem] shrink-0 snap-start overflow-hidden rounded-t-[999px] bg-[#181714] outline-none ring-offset-4 ring-offset-[#f5f0e7] focus-visible:ring-2 focus-visible:ring-[#8b6735] md:aspect-auto md:w-auto md:max-w-none ${portal.desktopHeight}`;

            return portal.href ? (
              <Link
                key={portal.label}
                href={portal.href}
                aria-label={`${portal.label}: ${portal.note}`}
                className={portalClass}
              >
                <PortalArtwork portal={portal} />
              </Link>
            ) : (
              <div
                key={portal.label}
                aria-label={`${portal.label}: ${portal.note}`}
                role="group"
                className={portalClass}
              >
                <PortalArtwork portal={portal} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
