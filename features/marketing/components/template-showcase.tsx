import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/config";
import { TemplateCard } from "@/features/template-marketplace/components/template-card";
import type { TemplateCard as TemplateCardData } from "@/features/template-marketplace/repository";

/**
 * A slice of the real catalogue, plus the full list of occasions.
 *
 * Renders the marketplace's own `TemplateCard` rather than a landing-page
 * lookalike: one card component means the "See it live" pill, the badges and
 * the hover behaviour cannot drift between the shop window and the shop.
 */
export function TemplateShowcase({
  templates,
  categories,
}: {
  templates: NonNullable<TemplateCardData>[];
  categories: { slug: string; name: string }[];
}) {
  if (templates.length === 0) return null;

  const starlight = templates.find(
    (template) => template.slug === "starlight-pony-dreamscape",
  );
  const otherTemplates = templates.filter(
    (template) => template.slug !== "starlight-pony-dreamscape",
  );

  return (
    <section className="bg-[#f5f0e7] text-[#181714]">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
              The invitation atelier
            </p>
            <h2 className="mt-4 max-w-3xl text-balance font-serif text-5xl leading-[0.96] tracking-[-0.04em] md:text-6xl">
              Choose a world, not a card.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-black/60">
              Each released design has its own entrance, rhythm and guest
              journey. Open one and experience it running for real.
            </p>
          </div>

          <Link
            href={routes.templates}
            className="inline-flex min-h-11 items-center gap-2 border-b border-black/30 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:border-black"
          >
            See all templates
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <ul className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={`${routes.templates}?category=${category.slug}`}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-black/[0.15] px-4 text-xs font-medium text-black/[0.58] transition-colors hover:border-black/50 hover:text-black"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {starlight ? (
          <article className="mt-10 grid overflow-hidden bg-[#080d2f] text-white shadow-[0_28px_80px_rgba(32,21,67,.18)] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.72fr)]">
            <div className="relative min-h-[34rem] overflow-hidden sm:min-h-[42rem] lg:min-h-[46rem]">
              <Image
                src={starlight.coverImageUrl}
                alt="An illustrated toddler embracing a gentle unicorn in a moonlit birthday dreamscape"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover object-center transition duration-1000 hover:scale-[1.02] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080d2f]/85 via-transparent to-[#080d2f]/10" />
              <p className="absolute left-6 top-6 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#ffe29a] sm:left-8 sm:top-8">
                Birthday world · 01
              </p>
              <p className="absolute inset-x-6 bottom-7 max-w-xl font-serif text-3xl leading-tight text-white sm:inset-x-8 sm:bottom-9 sm:text-4xl">
                First, an illustrated dream. Then, Mia steps into the magic.
              </p>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-12">
              <span
                aria-hidden="true"
                className="absolute -right-20 -top-20 size-64 rounded-full border border-[#f8c9ff]/20 shadow-[0_0_90px_rgba(224,139,255,.18)]"
              />
              <div className="relative">
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#ffe29a]">
                  Premium interactive birthday
                </p>
                <h3 className="mt-5 text-balance font-serif text-5xl leading-[0.92] tracking-[-0.04em] sm:text-6xl">
                  Starlight Pony Dreamscape
                </h3>
                <p className="mt-6 max-w-md text-sm leading-7 text-white/[0.68]">
                  A live name and age float over a moonlit storybook entrance.
                  Tap “Begin the Magic” and the invitation reveals a realistic
                  celebrant portrait, countdown, venue, and RSVP—all shaped for
                  the phone.
                </p>

                <div className="mt-9 border-y border-white/15 py-7">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f7c7ff]">
                    Live sample
                  </p>
                  <p className="mt-3 font-serif text-4xl leading-none text-[#ffd8ff]">
                    Mia <span className="text-[#ffe29a]">turns 3</span>
                  </p>
                  <p className="mt-3 text-xs leading-6 text-white/55">
                    Change the name, age, date, portrait, message, and place.
                    The world stays beautifully consistent.
                  </p>
                </div>
              </div>

              <div className="relative mt-10 grid gap-3">
                <Link
                  href={routes.templateLivePreview(starlight.slug)}
                  className="inline-flex min-h-12 items-center justify-between bg-[#f5d5ff] px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#13102c] transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Begin the magic
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                </Link>
                <Link
                  href={routes.template(starlight.slug)}
                  className="inline-flex min-h-12 items-center justify-between border border-white/30 px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Make this world yours
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {otherTemplates.length > 0 ? (
          <>
            <p className="mt-14 border-t border-black/15 pt-5 text-[9px] font-semibold uppercase tracking-[0.24em] text-black/50">
              More worlds to enter
            </p>
            <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {otherTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  favorited={false}
                  showFavorite={false}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
