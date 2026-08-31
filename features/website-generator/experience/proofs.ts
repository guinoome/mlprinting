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
 * The three WP20 proof experiences. This is the public-facing index used by
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
    sampleCover:
      "/api/placeholder/desktop/capiz-window?label=Maria%20%26%20Jose&caption=Filipino%20Wedding",
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
    sampleCover:
      "/api/placeholder/desktop/neon-eighteen?label=Isabella%20at%20Eighteen&caption=Debut%20Nightlife",
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
] as const;

export function proofExperienceForSlug(
  slug: string | null | undefined,
): ProofExperienceSummary | null {
  return PROOF_EXPERIENCES.find((proof) => proof.slug === slug) ?? null;
}
