"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Volume2 } from "lucide-react";
import { routes } from "@/lib/config";
import { PROOF_EXPERIENCES } from "@/features/website-generator/experience/proofs";

const HERO_COPY = {
  "capiz-window": {
    title: "Your story. Beautifully invited.",
    description:
      "Capiz light, cinematic portraiture and a ceremony-first journey—built as an invitation guests can explore, not a card they scroll past.",
    action: "Open Capiz Window",
  },
  "neon-eighteen": {
    title: "Eighteen enters after dark.",
    description:
      "A high-impact debut experience with event-poster type, a timed programme, music controls and an RSVP that feels part of the night.",
    action: "Enter Neon Eighteen",
  },
  "fiesta-banderitas": {
    title: "A celebration in full colour.",
    description:
      "Banderitas, cultural rhythm and a living programme turn a Filipino fiesta into a guest journey filled with movement and warmth.",
    action: "Join Fiesta Banderitas",
  },
  "product-launch": {
    title: "Make the first reveal unforgettable.",
    description:
      "Liquid light, keynote pacing and a conversion-ready RSVP introduce the product with the energy of the launch itself.",
    action: "Reveal Product Launch",
  },
} as const;

const LAUNCH_EXPERIENCES = PROOF_EXPERIENCES.slice(0, 4).map(
  (experience, index) => ({
    ...experience,
    ...HERO_COPY[experience.slug as keyof typeof HERO_COPY],
    label: `${String(index + 1).padStart(2, "0")} / ${experience.occasion}`,
    kicker: `${experience.tier.toLowerCase()} experience · ${experience.motionLevel} motion`,
    title: HERO_COPY[experience.slug as keyof typeof HERO_COPY].title,
    description:
      HERO_COPY[experience.slug as keyof typeof HERO_COPY].description,
    image: experience.catalogueCover,
    imageAlt: `${experience.name}, an interactive ${experience.occasion} invitation experience`,
    action: HERO_COPY[experience.slug as keyof typeof HERO_COPY].action,
  }),
);

export function LandingHero() {
  const [active, setActive] = React.useState(0);
  const experience = LAUNCH_EXPERIENCES[active];

  return (
    <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-black text-white">
      <Image
        key={experience.slug}
        src={experience.image}
        alt={experience.imageAlt}
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover duration-500 animate-in fade-in motion-reduce:animate-none"
      />

      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(3,4,6,.96)_0%,rgba(3,4,6,.72)_38%,rgba(3,4,6,.10)_74%),linear-gradient(0deg,rgba(3,4,6,.78),transparent_48%)]" />
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-white/20" />

      <div className="relative z-20 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-between px-5 py-9 md:px-8 md:py-12">
        <div className="flex items-start justify-between gap-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#e3c486]">
            ML Printing
            <br />
            <span className="text-[7px] tracking-[0.42em] text-white/55">
              Digital invitations
            </span>
          </p>
          <p className="hidden max-w-44 text-right text-[10px] uppercase leading-relaxed tracking-[0.2em] text-white/55 sm:block">
            Four experiences are live.
            <br />
            More join through curated releases.
          </p>
        </div>

        <div className="grid items-end gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:pb-0">
          <div
            key={experience.slug}
            className="max-w-3xl duration-500 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#e3c486]">
              {experience.kicker}
            </p>
            <h1 className="mt-5 max-w-3xl text-balance font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[6.6rem]">
              {experience.title}
            </h1>
            <p className="text-white/72 mt-6 max-w-xl text-pretty text-sm leading-7 sm:text-base">
              {experience.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={routes.templateLivePreview(experience.slug)}
                className="inline-flex min-h-12 items-center gap-3 bg-[#a4773c] px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#be9152] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black"
              >
                {experience.action}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55">
                <Volume2 className="size-4" aria-hidden="true" />
                Sound optional · motion adaptable
              </span>
            </div>
          </div>

          <div className="border-t border-white/25 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <p className="mb-4 text-[9px] uppercase tracking-[0.28em] text-white/45">
              Choose an experience
            </p>
            <div
              className="grid gap-1"
              role="tablist"
              aria-label="Launch experiences"
            >
              {LAUNCH_EXPERIENCES.map((item, index) => (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  onClick={() => setActive(index)}
                  className={`flex min-h-12 items-center justify-between border-b py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    index === active
                      ? "border-[#e3c486] text-white"
                      : "border-white/15 text-white/45 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span aria-hidden="true">{index === active ? "●" : "○"}</span>
                </button>
              ))}
            </div>
            <Link
              href={routes.acquisitionTemplates("home-hero")}
              className="mt-5 inline-flex text-[10px] uppercase tracking-[0.22em] text-white/65 underline decoration-white/30 underline-offset-4 hover:text-white"
            >
              Browse the full catalogue
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
