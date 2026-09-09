import Link from "next/link";
import Image from "next/image";
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
import { FaqSection } from "@/features/marketing/components/faq-section";
import { ExperienceProofShowcase } from "@/features/marketing/components/experience-proof-showcase";
import { ExperienceFinder } from "@/features/marketing/components/experience-finder";

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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Interactive digital invitations and matching print — ML Printing",
    description:
      "Explore real animated invitation previews, RSVP tools, and matching print designs from ML Printing in Cebu.",
    url: "/",
  },
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: branding.company,
    description: branding.tagline,
    areaServed: "Cebu, Philippines",
    sameAs: [social.facebook],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="flex-1">
        <LandingHero />

        <ExperienceFinder />

        <ExperienceProofShowcase />

        <FeatureHighlights />

        <TemplateShowcase
          templates={templates.slice(0, 4)}
          categories={categories}
        />

        <FaqSection />

        <section className="relative isolate min-h-[72svh] overflow-hidden bg-black text-white">
          <Image
            src="/experiences/capiz-window-hero.png"
            alt="A Filipino wedding couple surrounded by luminous capiz craftsmanship"
            fill
            sizes="100vw"
            className="object-cover object-[58%_45%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.94),rgba(5,5,5,.62)_48%,rgba(5,5,5,.12)),linear-gradient(0deg,rgba(5,5,5,.72),transparent_55%)]" />
          <div className="relative mx-auto flex min-h-[72svh] max-w-7xl items-end px-5 py-16 md:px-8 md:py-24">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#dfbd7e]">
                Your invitation begins here
              </p>
              <h2 className="mt-5 text-balance font-serif text-5xl leading-[0.94] tracking-[-0.04em] sm:text-6xl md:text-7xl">
                Find the world that feels like your day.
              </h2>
              <p className="text-white/68 mt-6 max-w-lg text-pretty text-sm leading-7 md:text-base">
                Browse by feeling, open the real guest experience, then make it
                yours with photos, programme, venue and RSVP. No account needed
                to explore.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 min-h-12 rounded-none bg-[#a4773c] px-7 text-white hover:bg-[#be9152]"
              >
                <Link href={routes.acquisitionTemplates("home-closing")}>
                  Enter the collection
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0b0d12] text-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-serif text-xl tracking-[0.08em] text-[#dfbd7e]">
                {branding.company}
              </p>
              <p className="mt-2 text-xs text-white/45">{branding.location}</p>
              {/* Messenger before email: it is how an enquiry actually arrives. */}
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href={social.messenger}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                >
                  Message us
                </a>
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                >
                  Facebook
                </a>
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/50">
              <Link
                href={routes.templates}
                className="transition-colors hover:text-white"
              >
                Templates
              </Link>
              <Link
                href={routes.login}
                className="transition-colors hover:text-white"
              >
                Sign in
              </Link>
              {features.registration ? (
                <Link
                  href={routes.register}
                  className="transition-colors hover:text-white"
                >
                  Create an account
                </Link>
              ) : null}
            </nav>
          </div>

          <p className="text-white/38 mt-10 border-t border-white/10 pt-6 text-xs">
            © {new Date().getFullYear()} {branding.company}. {branding.tagline}
          </p>
        </div>
      </footer>

      <MessengerButton />
    </div>
  );
}
