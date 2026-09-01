import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/config";
import { PROOF_EXPERIENCES } from "@/features/website-generator/experience/proofs";

/**
 * A cinematic occasion rail rather than a portrait stationery grid. Each panel
 * opens the real shared renderer, so the imagery sells a working experience.
 */
export function TemplateShowcase() {
  const experiences = PROOF_EXPERIENCES.slice(0, 4);

  return (
    <section className="bg-[#f4f0e8] text-[#171713]">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="max-w-2xl font-serif text-5xl leading-[.96] tracking-[-.04em] md:text-7xl">
              Find your experience.
            </h2>
            <p className="text-black/58 mt-5 max-w-xl text-sm leading-7">
              Four distinct openings are live now. Choose a world to enter, then
              replace the sample photographs with your own story.
            </p>
          </div>
          <Link
            href={routes.templates}
            className="text-[10px] font-semibold uppercase tracking-[.22em] underline decoration-black/25 underline-offset-8"
          >
            Explore the collection
          </Link>
        </header>

        <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-1 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {experiences.map((experience, index) => (
            <article
              key={experience.slug}
              className={`group relative min-h-[34rem] min-w-[82vw] snap-center overflow-hidden sm:min-w-[54vw] md:min-w-0 ${
                index % 2 ? "md:translate-y-8" : ""
              }`}
            >
              <Image
                src={experience.catalogueCover}
                alt={`${experience.name} interactive ${experience.occasion} experience`}
                fill
                priority={index === 0}
                sizes="(min-width: 768px) 25vw, 82vw"
                className="object-cover transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/15" />
              <Link
                href={routes.templateLivePreview(experience.slug)}
                className="absolute inset-0 z-10 flex flex-col justify-between p-6 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <div className="flex items-start justify-between">
                  <p className="text-white/72 text-[9px] font-semibold uppercase tracking-[.26em]">
                    {experience.occasion}
                  </p>
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[.24em] text-[#dfbd7e]">
                    {experience.tier} · {experience.motionLevel}
                  </p>
                  <h3 className="mt-3 font-serif text-4xl leading-none">
                    {experience.name}
                  </h3>
                  <p className="text-white/66 mt-4 max-w-xs text-xs leading-5">
                    {experience.promise}
                  </p>
                  <span className="mt-6 inline-block border-b border-[#dfbd7e] pb-2 text-[9px] font-semibold uppercase tracking-[.22em]">
                    Open live experience
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        <p className="text-black/42 mt-12 text-[9px] uppercase tracking-[.24em] md:mt-16">
          Swipe or scroll to explore · Every opening works with keyboard and
          reduced motion
        </p>
      </div>
    </section>
  );
}
