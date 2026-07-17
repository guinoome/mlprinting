import { describe, expect, it } from "vitest";
import {
  BasicRecommendationStrategy,
  popularityScore,
  freshnessScore,
} from "./basic-strategy";
import type { RecommendationCandidate } from "./types";

const NOW = new Date("2026-07-17T00:00:00.000Z");
const strategy = new BasicRecommendationStrategy();

function candidate(
  over: Partial<RecommendationCandidate> = {},
): RecommendationCandidate {
  return {
    id: over.slug ?? over.id ?? "t1",
    slug: over.slug ?? "template-one",
    categorySlug: "wedding",
    useCount: 0,
    publishedAt: new Date("2026-01-01T00:00:00Z"), // Old enough to score no freshness.
    isFeatured: false,
    tags: [],
    colors: [],
    styles: [],
    ...over,
  };
}

/** Score of one candidate under given signals. */
function scoreOf(c: RecommendationCandidate, signals = {}) {
  return strategy.recommend([c], { now: NOW, ...signals }, 10)[0]!.score;
}

describe("popularityScore", () => {
  it("is zero for an unused template", () => {
    expect(popularityScore(0)).toBe(0);
    expect(popularityScore(-5)).toBe(0);
  });

  it("increases with use", () => {
    expect(popularityScore(100)).toBeGreaterThan(popularityScore(10));
  });

  it("is log-scaled, so a runaway hit cannot dominate forever", () => {
    // The gap from 10→100 must dwarf the gap from 400→500. Linear scaling would
    // make one popular template unbeatable by any other signal.
    const earlyGain = popularityScore(100) - popularityScore(10);
    const lateGain = popularityScore(500) - popularityScore(400);
    expect(earlyGain).toBeGreaterThan(lateGain * 5);
  });

  it("is capped", () => {
    expect(popularityScore(1_000_000)).toBeLessThanOrEqual(40);
  });
});

describe("freshnessScore", () => {
  it("is highest for a brand-new template", () => {
    expect(freshnessScore(NOW, NOW)).toBeCloseTo(20);
  });

  it("decays with age", () => {
    const fresh = freshnessScore(new Date("2026-07-10T00:00:00Z"), NOW);
    const stale = freshnessScore(new Date("2026-06-20T00:00:00Z"), NOW);
    expect(fresh).toBeGreaterThan(stale);
  });

  it("is zero past the window", () => {
    expect(freshnessScore(new Date("2025-01-01T00:00:00Z"), NOW)).toBe(0);
  });

  it("is zero for a draft", () => {
    expect(freshnessScore(null, NOW)).toBe(0);
  });

  it("treats a future publication as brand new rather than negative", () => {
    expect(freshnessScore(new Date("2026-08-01T00:00:00Z"), NOW)).toBe(20);
  });
});

describe("BasicRecommendationStrategy — signals (Ph2 §8)", () => {
  it("ranks event-type match above everything else", () => {
    // A wildly popular, featured, brand-new birthday template must still lose to
    // a plain wedding template when the user is planning a wedding.
    const wrongType = candidate({
      id: "birthday",
      slug: "a-birthday",
      categorySlug: "birthday",
      useCount: 900,
      isFeatured: true,
      publishedAt: NOW,
    });
    const rightType = candidate({
      id: "wedding",
      slug: "z-wedding",
      categorySlug: "wedding",
    });

    const ranked = strategy.recommend(
      [wrongType, rightType],
      {
        eventTypeSlug: "wedding",
        now: NOW,
      },
      10,
    );

    expect(ranked[0]!.templateId).toBe("wedding");
  });

  it("explains an event-type match", () => {
    const ranked = strategy.recommend(
      [candidate()],
      { eventTypeSlug: "wedding", now: NOW },
      10,
    );
    expect(ranked[0]!.reasons).toContain("Matches your event type");
  });

  it("rewards popularity", () => {
    expect(scoreOf(candidate({ useCount: 200 }))).toBeGreaterThan(
      scoreOf(candidate()),
    );
  });

  it("rewards featured templates", () => {
    expect(scoreOf(candidate({ isFeatured: true }))).toBeGreaterThan(
      scoreOf(candidate()),
    );
  });

  it("rewards freshness", () => {
    expect(scoreOf(candidate({ publishedAt: NOW }))).toBeGreaterThan(
      scoreOf(candidate()),
    );
  });

  it("demotes something already used — recommendations should surface something new", () => {
    const used = candidate({ id: "t1", useCount: 500 });
    expect(scoreOf(used, { recentlyUsedIds: ["t1"] })).toBeLessThan(
      scoreOf(used),
    );
  });

  it("says so when a template was already used", () => {
    const ranked = strategy.recommend(
      [candidate({ id: "t1" })],
      {
        recentlyUsedIds: ["t1"],
        now: NOW,
      },
      10,
    );
    expect(ranked[0]!.reasons).toContain("You have already used this");
  });

  it("mildly demotes something viewed and not used", () => {
    const viewed = candidate({ id: "t1" });
    const plain = scoreOf(viewed);
    const afterView = scoreOf(viewed, { recentlyViewedIds: ["t1"] });

    expect(afterView).toBeLessThan(plain);
    // Softer than the used penalty: looking is weaker evidence than choosing.
    expect(plain - afterView).toBeLessThan(60);
  });
});

describe("BasicRecommendationStrategy — affinity", () => {
  const liked = candidate({
    id: "liked",
    slug: "liked",
    colors: ["blush"],
    styles: ["modern"],
  });

  it("rewards sharing facets with a favourited template", () => {
    const similar = candidate({
      id: "similar",
      slug: "similar",
      colors: ["blush"],
    });
    const different = candidate({
      id: "different",
      slug: "different",
      colors: ["navy"],
    });

    const ranked = strategy.recommend(
      [liked, similar, different],
      {
        favoritedIds: ["liked"],
        now: NOW,
      },
      10,
    );

    const similarScore = ranked.find((r) => r.templateId === "similar")!.score;
    const differentScore = ranked.find(
      (r) => r.templateId === "different",
    )!.score;
    expect(similarScore).toBeGreaterThan(differentScore);
  });

  it("names the shared facets in the reason", () => {
    const similar = candidate({
      id: "similar",
      slug: "similar",
      colors: ["blush"],
    });
    const ranked = strategy.recommend(
      [liked, similar],
      { favoritedIds: ["liked"], now: NOW },
      10,
    );

    expect(
      ranked.find((r) => r.templateId === "similar")!.reasons.join(" "),
    ).toContain("blush");
  });

  it("caps affinity so facet-stuffing cannot outrank event type", () => {
    const stuffed = candidate({
      id: "stuffed",
      slug: "stuffed",
      categorySlug: "birthday",
      tags: Array.from({ length: 50 }, (_, i) => `tag${i}`),
    });
    const likedStuffed = candidate({
      id: "liked",
      slug: "liked",
      tags: Array.from({ length: 50 }, (_, i) => `tag${i}`),
    });
    const rightType = candidate({
      id: "right",
      slug: "right",
      categorySlug: "wedding",
    });

    const ranked = strategy.recommend(
      [stuffed, likedStuffed, rightType],
      {
        eventTypeSlug: "wedding",
        favoritedIds: ["liked"],
        now: NOW,
      },
      10,
    );

    expect(ranked[0]!.templateId).not.toBe("stuffed");
  });

  it("scores no affinity when nothing is liked", () => {
    const ranked = strategy.recommend(
      [candidate({ colors: ["blush"] })],
      { now: NOW },
      10,
    );
    expect(ranked[0]!.reasons.join(" ")).not.toContain("Similar to");
  });
});

describe("BasicRecommendationStrategy — contract", () => {
  it("respects the limit", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      candidate({ id: `t${i}`, slug: `t${i}` }),
    );
    expect(strategy.recommend(candidates, { now: NOW }, 3)).toHaveLength(3);
  });

  it("returns nothing for no candidates", () => {
    expect(strategy.recommend([], { now: NOW }, 5)).toEqual([]);
  });

  it("is deterministic — equal scores break ties on slug, not on argument order", () => {
    const a = candidate({ id: "a", slug: "aaa" });
    const b = candidate({ id: "b", slug: "bbb" });

    const forward = strategy
      .recommend([a, b], { now: NOW }, 10)
      .map((r) => r.templateId);
    const backward = strategy
      .recommend([b, a], { now: NOW }, 10)
      .map((r) => r.templateId);

    expect(forward).toEqual(backward);
    expect(forward).toEqual(["a", "b"]);
  });

  it("does not mutate its input", () => {
    const candidates = [
      candidate({ id: "b", slug: "bbb" }),
      candidate({ id: "a", slug: "aaa" }),
    ];
    strategy.recommend(candidates, { now: NOW }, 10);
    expect(candidates.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("names itself, so a ranking can be attributed in logs", () => {
    expect(strategy.name).toBe("basic-weighted");
  });

  it("sorts by descending score", () => {
    const ranked = strategy.recommend(
      [
        candidate({ id: "low", slug: "low" }),
        candidate({
          id: "high",
          slug: "high",
          isFeatured: true,
          useCount: 300,
        }),
      ],
      { now: NOW },
      10,
    );

    expect(ranked[0]!.templateId).toBe("high");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });
});
