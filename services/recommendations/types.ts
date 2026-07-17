/**
 * Recommendation contract — Ph2.md §8.
 *
 * "The recommendation engine should be replaceable by future AI enhancements."
 * That sentence is the whole design brief, and it is why this file exists apart
 * from the implementation: callers depend on `RecommendationStrategy`, never on
 * the basic scorer behind it. Swapping in a model means writing a new strategy
 * and changing one line in index.ts.
 *
 * Two properties make that swap safe, and both are load-bearing:
 *
 *   1. The strategy is handed candidates and signals. It does not query. A
 *      strategy that reaches for Prisma is a strategy that cannot be replaced by
 *      an HTTP call to a model, and cannot be unit-tested without a database.
 *   2. It returns scores with reasons, not a re-ordered list. The caller decides
 *      what to do with a score; the UI can explain a placement; and a future
 *      model's output slots into the same shape.
 */

/** What a strategy is allowed to know about a template. Deliberately small. */
export interface RecommendationCandidate {
  id: string;
  slug: string;
  categorySlug: string;
  /** Ph2.md §8 — Popularity. */
  useCount: number;
  publishedAt: Date | null;
  isFeatured: boolean;
  tags: string[];
  colors: string[];
  styles: string[];
}

/** What a strategy is allowed to know about the person. */
export interface RecommendationSignals {
  /** Ph2.md §8 — Event Type. The strongest signal available in Phase 2. */
  eventTypeSlug?: string;
  /** Ph2.md §8 — Recently Used. Template ids, most recent first. */
  recentlyUsedIds?: string[];
  /** Ph2.md §9 — Recently Viewed. Template ids, most recent first. */
  recentlyViewedIds?: string[];
  /** Favourited template ids. */
  favoritedIds?: string[];
  /** Injectable for deterministic tests. */
  now?: Date;
}

export interface Recommendation {
  templateId: string;
  /** Higher is better. Only the ordering is meaningful — the absolute value is not. */
  score: number;
  /**
   * Why this scored as it did, most significant first.
   *
   * Not decoration. When a recommendation looks wrong, this is the difference
   * between reading the ranking and guessing at it — and when a model replaces
   * the scorer, it is the only thing that keeps the output auditable.
   */
  reasons: string[];
}

export interface RecommendationStrategy {
  /** Identifies the strategy in logs and in the admin view. */
  readonly name: string;

  recommend(
    candidates: RecommendationCandidate[],
    signals: RecommendationSignals,
    limit: number,
  ): Recommendation[];
}
