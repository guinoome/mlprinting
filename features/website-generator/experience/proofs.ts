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
  /** Wide, text-free artwork used by the public catalogue. */
  catalogueCover: string;
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
    catalogueCover: "/experiences/capiz-window-catalogue.png",
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
    catalogueCover: "/experiences/neon-eighteen-catalogue.png",
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
    catalogueCover: "/experiences/fiesta-banderitas-catalogue.png",
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
    catalogueCover: "/experiences/product-launch-catalogue.png",
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
    catalogueCover:
      "/api/placeholder/desktop/in-loving-memory?label=Rosario%20Santos&caption=In%20Loving%20Memory",
  },
] as const;

export function proofExperienceForSlug(
  slug: string | null | undefined,
): ProofExperienceSummary | null {
  return PROOF_EXPERIENCES.find((proof) => proof.slug === slug) ?? null;
}
