import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/nav/site-header";
import { MessengerButton } from "@/components/messenger-button";
import { branding, routes, features, social } from "@/lib/config";
import { LandingHero } from "@/features/marketing/components/landing-hero";
import { FeatureHighlights } from "@/features/marketing/components/feature-highlights";
import { TemplateShowcase } from "@/features/marketing/components/template-showcase";
import { FaqSection } from "@/features/marketing/components/faq-section";
import { ExperienceProofShowcase } from "@/features/marketing/components/experience-proof-showcase";

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

        <TemplateShowcase />

        <ExperienceProofShowcase />

        <FeatureHighlights />

        <FaqSection />

        <section className="bg-[#0d0c0a] text-white">
          <div className="mx-auto grid max-w-7xl md:grid-cols-2">
            <div className="relative min-h-[24rem] overflow-hidden md:min-h-[34rem]">
              <Image
                src="/experiences/capiz-window-catalogue.png"
                alt="Filipino wedding couple in a luminous capiz setting"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="flex flex-col justify-center px-6 py-16 md:px-14">
              <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#dfbd7e]">
                Begin with the feeling
              </p>
              <h2 className="mt-6 text-balance font-serif text-5xl leading-[.95] tracking-[-.04em] md:text-6xl">
                Let&apos;s bring your story to life.
              </h2>
              <p className="text-white/58 mt-6 max-w-md text-sm leading-7">
                Open the live experiences, choose the one that feels right, and
                make it yours with your photographs, words, and event details.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-9 w-fit bg-[#b3874b] text-white hover:bg-[#c99b5d]"
              >
                <Link href={routes.acquisitionTemplates("home-closing")}>
                  Find your experience
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#090909] px-5 py-10 text-white md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-serif text-xl tracking-[.08em] text-[#dfbd7e]">
                {branding.company}
              </p>
              <p className="mt-1 text-xs text-white/45">{branding.location}</p>
              {/* Messenger before email: it is how an enquiry actually arrives. */}
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a
                  href={social.messenger}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-white/55 underline underline-offset-4 transition-colors hover:text-white"
                >
                  Message us
                </a>
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-white/55 underline underline-offset-4 transition-colors hover:text-white"
                >
                  Facebook
                </a>
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
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

          <p className="border-white/12 mt-8 border-t pt-6 text-xs text-white/40">
            © {new Date().getFullYear()} {branding.company}. {branding.tagline}
          </p>
        </div>
      </footer>

      <MessengerButton />
    </div>
  );
}
