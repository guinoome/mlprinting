import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/nav/site-header";
import { MessengerButton } from "@/components/messenger-button";
import { branding, routes, features, social } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getCatalogPage,
  getCategories,
} from "@/features/template-marketplace/repository";
import { parseCriteria } from "@/features/template-marketplace/criteria";
import { LandingHero } from "@/features/marketing/components/landing-hero";
import { FeatureHighlights } from "@/features/marketing/components/feature-highlights";
import { TemplateShowcase } from "@/features/marketing/components/template-showcase";
import { Testimonials } from "@/features/marketing/components/testimonials";
import { FaqSection } from "@/features/marketing/components/faq-section";

/**
 * Landing page.
 *
 * Built from the live catalogue rather than hard-coded marketing art: the hero
 * stack and the showcase are real templates, so the shop window can never
 * advertise a design the shop does not stock. It degrades to a hero and copy
 * when there is no database, which is what CI builds against.
 *
 * Dynamic because the header branches on the session — prerendered, it would
 * offer "Sign in" to someone already signed in.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${branding.product} — ${branding.company}`,
  description:
    "Animated digital invitations with RSVPs, and printed suites to match. Weddings, debuts, christenings and more, from ML Printing in Cebu.",
};

export default async function Home() {
  const showCatalogue = features.templateMarketplace && isDatabaseConfigured();

  // One page of the catalogue is enough for both the hero stack and the
  // showcase; asking twice would be two round trips for the same rows.
  const [page, categories] = showCatalogue
    ? await Promise.all([
        // Empty params gives the catalogue's own defaults — recommended order,
        // which puts featured templates first. Exactly what a shop window wants.
        getCatalogPage({ ...parseCriteria({}), perPage: 8 }),
        getCategories(),
      ])
    : [null, []];

  const templates = page?.templates ?? [];
  const covers = templates.slice(0, 3).map((template) => ({
    src: template.coverImageUrl,
    alt: template.name,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <LandingHero
          covers={covers}
          livePreviewSlug={templates[0]?.slug ?? null}
        />

        <FeatureHighlights />

        <TemplateShowcase
          templates={templates.slice(0, 4)}
          categories={categories}
        />

        <Testimonials />

        <FaqSection />

        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
            <h2 className="text-balance font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
              Find the one that feels like your day.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Browse the catalogue and open any design to see the invitation it
              becomes. No account needed.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={routes.templates}>
                Browse templates
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              {branding.company}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {branding.location}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {branding.supportEmail}
            </p>
            {/* Messenger before email: it is how an enquiry actually arrives. */}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a
                href={social.messenger}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Message us
              </a>
              <a
                href={social.facebook}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Facebook
              </a>
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link
              href={routes.templates}
              className="transition-colors hover:text-foreground"
            >
              Templates
            </Link>
            <Link
              href={routes.login}
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            {features.registration ? (
              <Link
                href={routes.register}
                className="transition-colors hover:text-foreground"
              >
                Create an account
              </Link>
            ) : null}
          </nav>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {branding.company}. {branding.tagline}
        </p>
      </footer>

      <MessengerButton />
    </div>
  );
}
