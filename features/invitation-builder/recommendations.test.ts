import { describe, expect, it } from "vitest";
import type { RecommendationCandidate } from "@/services/recommendations";
import { curateTemplateChoices } from "./recommendations";

const NOW = new Date("2026-08-30T00:00:00.000Z");

function candidate(
  id: string,
  categorySlug: string,
  over: Partial<RecommendationCandidate> = {},
): RecommendationCandidate {
  return {
    id,
    slug: id,
    categorySlug,
    useCount: 0,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    isFeatured: false,
    tags: [],
    colors: [],
    styles: [],
    ...over,
  };
}

describe("curateTemplateChoices", () => {
  it("returns a small event-relevant set with explainable reasons", () => {
    const choices = curateTemplateChoices(
      [
        candidate("birthday", "birthday", { useCount: 500 }),
        candidate("wedding-a", "wedding"),
        candidate("wedding-b", "wedding", { isFeatured: true }),
      ],
      { eventTypeSlug: "wedding", now: NOW },
      null,
      2,
    );

    expect(choices).toHaveLength(2);
    expect(choices.map((choice) => choice.template.id)).toEqual([
      "wedding-b",
      "wedding-a",
    ]);
    expect(choices[0]!.reasons).toContain("Matches your event type");
  });

  it("keeps the current selection visible when it falls outside the top set", () => {
    const choices = curateTemplateChoices(
      [
        candidate("selected", "birthday"),
        candidate("wedding-a", "wedding", { isFeatured: true }),
        candidate("wedding-b", "wedding"),
      ],
      { eventTypeSlug: "wedding", now: NOW },
      "selected",
      2,
    );

    expect(choices).toHaveLength(2);
    expect(choices[0]!.template.id).toBe("selected");
    expect(choices[0]!.reasons[0]).toBe("Your current selection");
  });

  it("does not mutate the candidate list", () => {
    const candidates = [
      candidate("b", "wedding"),
      candidate("a", "wedding"),
    ];
    const before = candidates.map((item) => item.id);

    curateTemplateChoices(candidates, { now: NOW }, null, 1);

    expect(candidates.map((item) => item.id)).toEqual(before);
  });

  it("returns an empty set for an empty catalogue or non-positive limit", () => {
    expect(curateTemplateChoices([], { now: NOW }, null)).toEqual([]);
    expect(
      curateTemplateChoices([candidate("a", "wedding")], { now: NOW }, null, 0),
    ).toEqual([]);
  });
});
