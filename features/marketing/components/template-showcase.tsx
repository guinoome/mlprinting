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
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-balance font-serif text-3xl leading-tight tracking-tight">
              Designs for every occasion.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Tap any design to see the invitation it becomes, running for real.
            </p>
          </div>

          <Link
            href={routes.templates}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          >
            See all templates
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`${routes.templates}?category=${category.slug}`}
                  className="inline-block rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
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
