import { BasicRecommendationStrategy } from "./basic-strategy";
import type { RecommendationStrategy } from "./types";

/**
 * Recommendation service — Ph2.md §8.
 *
 * This file is the seam. Replacing the basic scorer with an AI-backed one is a
 * change to `activeStrategy` and nothing else: no caller imports a concrete
 * strategy, and no caller knows how a score was produced.
 */

const basic = new BasicRecommendationStrategy();

/**
 * The strategy in use.
 *
 * A function rather than a constant so a future implementation can choose per
 * request — an AI strategy with a per-call cost is one a caller may need to
 * skip under load, or gate behind a flag (V1 §11: paid services need approval
 * before they ship).
 */
export function activeStrategy(): RecommendationStrategy {
  return basic;
}

export { BasicRecommendationStrategy } from "./basic-strategy";
export { popularityScore, freshnessScore } from "./basic-strategy";
export type {
  RecommendationStrategy,
  RecommendationCandidate,
  RecommendationSignals,
  Recommendation,
} from "./types";
