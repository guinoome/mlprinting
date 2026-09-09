import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
                  className="text-black/58 inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-black/15 px-4 text-xs font-medium transition-colors hover:border-black/50 hover:text-black"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              favorited={false}
              showFavorite={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
