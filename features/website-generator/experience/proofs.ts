import type { EventKind } from "@/lib/invitation/preview-model";

export interface ProofExperienceSummary {
  slug: string;
  name: string;
  occasion: string;
  eventKind: EventKind;
  tier: "CORE" | "SIGNATURE" | "IMMERSIVE";
  motionLevel: "M2" | "M3" | "M4";
  motionProfile: string;
  promise: string;
  sampleCover: string;
}

/**
 * Release-gated proof experiences. This is the public-facing index used by
 * the homepage and the sample route; renderer configuration remains in the
 * registry so the marketing surface cannot silently point at an unknown slug.
 */
export const PROOF_EXPERIENCES: readonly ProofExperienceSummary[] = [
  {
    slug: "capiz-window",
    name: "Capiz Window",
    occasion: "Filipino wedding",
    eventKind: "wedding",
    tier: "SIGNATURE",
    motionLevel: "M3",
    motionProfile: "MP-14",
    promise: "Layered capiz panes turn light into a ceremonial reveal.",
    sampleCover: "/experiences/capiz-window-hero.png",
  },
  {
    slug: "neon-eighteen",
    name: "Neon Eighteen",
    occasion: "Debut nightlife",
    eventKind: "debut",
    tier: "IMMERSIVE",
    motionLevel: "M4",
    motionProfile: "MP-09",
    promise: "A neon pulse makes the invitation feel like entering the event.",
    sampleCover: "/experiences/neon-eighteen-hero.png",
  },
  {
    slug: "fiesta-banderitas",
    name: "Fiesta Banderitas",
    occasion: "Filipino street fiesta",
    eventKind: "fiesta",
    tier: "SIGNATURE",
    motionLevel: "M3",
    motionProfile: "MP-10",
    promise: "Banderitas sweep guests into a living Cebuano festival route.",
    sampleCover: "/experiences/fiesta-banderitas-hero.png",
  },
  {
    slug: "product-launch",
    name: "Product Launch",
    occasion: "Corporate keynote",
    eventKind: "corporate",
    tier: "IMMERSIVE",
    motionLevel: "M4",
    motionProfile: "MP-11",
    promise: "Liquid light turns the invitation into a keynote reveal.",
    sampleCover: "/experiences/product-launch-catalogue.png",
  },
  {
    slug: "in-loving-memory",
    name: "In Loving Memory",
    occasion: "Quiet tribute",
    eventKind: "funeral",
    tier: "CORE",
    motionLevel: "M2",
    motionProfile: "MP-12",
    promise: "A dignified portrait keeps service information close at hand.",
    sampleCover:
      "/api/placeholder/desktop/in-loving-memory?label=Rosario%20Santos&caption=In%20Loving%20Memory",
  },
  {
    slug: "ivory-lace",
    name: "Ivory Lace",
    occasion: "Couture wedding",
    eventKind: "wedding",
    tier: "SIGNATURE",
    motionLevel: "M3",
    motionProfile: "MP-01",
    promise:
      "A lace-shadow threshold opens into a restrained editorial ceremony.",
    sampleCover: "/experiences/ivory-lace-hero.png",
  },
  {
    slug: "blush-botanical",
    name: "Blush Botanical",
    occasion: "Garden wedding",
    eventKind: "wedding",
    tier: "SIGNATURE",
    motionLevel: "M3",
    motionProfile: "MP-06",
    promise: "Pressed botanicals unfurl into a warm garden guest journey.",
    sampleCover: "/experiences/blush-botanical-hero.png",
  },
  {
    slug: "midnight-gold",
    name: "Midnight Gold",
    occasion: "Black-tie wedding",
    eventKind: "wedding",
    tier: "SIGNATURE",
    motionLevel: "M3",
    motionProfile: "MP-02",
    promise: "Midnight panels part to reveal a candlelit evening programme.",
    sampleCover: "/experiences/midnight-gold-hero.png",
  },
  {
    slug: "starlight-pony-dreamscape",
    name: "Starlight Pony Dreamscape",
    occasion: "Children's birthday",
    eventKind: "birthday",
    tier: "IMMERSIVE",
    motionLevel: "M3",
    motionProfile: "MP-storybook",
    promise:
      "A chosen celebrant portrait becomes the heart of a luminous pony dreamscape.",
    sampleCover: "/experiences/starlight-pony-dreamscape-catalogue.webp",
  },
] as const;

export function proofExperienceForSlug(
  slug: string | null | undefined,
): ProofExperienceSummary | null {
  return PROOF_EXPERIENCES.find((proof) => proof.slug === slug) ?? null;
}
