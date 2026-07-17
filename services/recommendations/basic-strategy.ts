import type {
  RecommendationStrategy,
  RecommendationCandidate,
  RecommendationSignals,
  Recommendation,
} from "./types";

/**
 * The basic recommender — Ph2.md §8 ("Implement a simple recommendation
 * framework based on: Event Type, Popularity, Recently Used").
 *
 * A weighted sum of the three signals the spec names. No learning, no model,
 * no personalisation beyond what the person has already done on this site. That
 * is the assignment: §8 says *basic*, and the value of this phase is the seam
 * (types.ts), not the arithmetic.
 *
 * The weights below are judgement, not measurement — there is no usage data yet
 * to fit them against. They are written as named constants so the judgement is
 * visible and arguable rather than sprinkled through the function as magic
 * numbers.
 */

const WEIGHTS = {
  /** Event type dominates. A birthday template is wrong for a wedding no matter how popular. */
  eventTypeMatch: 100,
  /** Popularity, scaled — see popularityScore. Capped so a hit cannot outrank relevance. */
  popularityMax: 40,
  /** Featured is a human's judgement; it should count, but not beat what the user asked for. */
  featured: 25,
  /** Freshness, decaying over the window below. */
  freshnessMax: 20,
  /** Shared tags/colours/styles with something they already liked. Per match, capped. */
  affinityPerMatch: 6,
  affinityMax: 30,
  /** Already used. Negative: "recommended" should surface something new. */
  recentlyUsed: -60,
  /** Already viewed and not used. Mildly negative — they looked and moved on. */
  recentlyViewed: -8,
} as const;

/** Freshness decays to zero over this many days. */
const FRESHNESS_WINDOW_DAYS = 60;

/**
 * Popularity, log-scaled and capped.
 *
 * Linear scaling would let one runaway template dominate every list forever:
 * with 500 uses against a field of 20, no other signal could ever catch it, and
 * the recommender would spend its life recommending the thing that is already
 * winning. Log turns "10 vs 100 uses" into a real difference and "400 vs 500"
 * into almost none, which is how popularity actually informs a choice.
 */
export function popularityScore(useCount: number): number {
  if (useCount <= 0) return 0;
  const scaled = Math.log10(useCount + 1) / Math.log10(1001); // 1000 uses ≈ full marks
  return Math.min(scaled, 1) * WEIGHTS.popularityMax;
}

/** Freshness, decaying linearly to zero at the window edge. */
export function freshnessScore(publishedAt: Date | null, now: Date): number {
  if (!publishedAt) return 0;

  const ageDays = (now.getTime() - publishedAt.getTime()) / 86_400_000;
  if (ageDays < 0) return WEIGHTS.freshnessMax; // Scheduled ahead; treat as brand new.
  if (ageDays >= FRESHNESS_WINDOW_DAYS) return 0;

  return (1 - ageDays / FRESHNESS_WINDOW_DAYS) * WEIGHTS.freshnessMax;
}

/**
 * Overlap between this template's facets and those of templates the person has
 * already favourited or used. The cheapest possible content-based filtering:
 * "you liked blush, here is more blush".
 */
function affinityScore(
  candidate: RecommendationCandidate,
  likedFacets: Set<string>,
): { score: number; matches: string[] } {
  if (likedFacets.size === 0) return { score: 0, matches: [] };

  const matches = [
    ...candidate.tags,
    ...candidate.colors,
    ...candidate.styles,
  ].filter((facet) => likedFacets.has(facet));

  const unique = [...new Set(matches)];
  const score = Math.min(
    unique.length * WEIGHTS.affinityPerMatch,
    WEIGHTS.affinityMax,
  );
  return { score, matches: unique };
}

/** Facets of templates the person has signalled they like. */
function likedFacetsFrom(
  candidates: RecommendationCandidate[],
  signals: RecommendationSignals,
): Set<string> {
  const likedIds = new Set([
    ...(signals.favoritedIds ?? []),
    ...(signals.recentlyUsedIds ?? []),
  ]);

  const facets = new Set<string>();
  for (const candidate of candidates) {
    if (!likedIds.has(candidate.id)) continue;
    for (const facet of [
      ...candidate.tags,
      ...candidate.colors,
      ...candidate.styles,
    ]) {
      facets.add(facet);
    }
  }
  return facets;
}

export class BasicRecommendationStrategy implements RecommendationStrategy {
  readonly name = "basic-weighted";

  recommend(
    candidates: RecommendationCandidate[],
    signals: RecommendationSignals,
    limit: number,
  ): Recommendation[] {
    const now = signals.now ?? new Date();
    const recentlyUsed = new Set(signals.recentlyUsedIds ?? []);
    const recentlyViewed = new Set(signals.recentlyViewedIds ?? []);
    const likedFacets = likedFacetsFrom(candidates, signals);

    const scored = candidates.map((candidate): Recommendation => {
      let score = 0;
      const reasons: string[] = [];

      if (
        signals.eventTypeSlug &&
        candidate.categorySlug === signals.eventTypeSlug
      ) {
        score += WEIGHTS.eventTypeMatch;
        reasons.push("Matches your event type");
      }

      const popularity = popularityScore(candidate.useCount);
      if (popularity > 0) {
        score += popularity;
        if (candidate.useCount >= 50)
          reasons.push("Popular with other customers");
      }

      if (candidate.isFeatured) {
        score += WEIGHTS.featured;
        reasons.push("Featured by ML Printing");
      }

      const freshness = freshnessScore(candidate.publishedAt, now);
      if (freshness > 0) {
        score += freshness;
        if (freshness > WEIGHTS.freshnessMax / 2)
          reasons.push("Recently added");
      }

      const affinity = affinityScore(candidate, likedFacets);
      if (affinity.score > 0) {
        score += affinity.score;
        reasons.push(
          `Similar to templates you liked (${affinity.matches.slice(0, 3).join(", ")})`,
        );
      }

      if (recentlyUsed.has(candidate.id)) {
        score += WEIGHTS.recentlyUsed;
        reasons.push("You have already used this");
      } else if (recentlyViewed.has(candidate.id)) {
        score += WEIGHTS.recentlyViewed;
      }

      return { templateId: candidate.id, score, reasons };
    });

    return scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Stable tiebreak on a unique key, for the same reason buildOrderBy has
        // one: equal scores must not order arbitrarily between calls.
        const slugA = candidates.find((c) => c.id === a.templateId)?.slug ?? "";
        const slugB = candidates.find((c) => c.id === b.templateId)?.slug ?? "";
        return slugA.localeCompare(slugB);
      })
      .slice(0, limit);
  }
}
