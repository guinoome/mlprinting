import { describe, expect, it } from "vitest";
import { proofExperienceForSlug } from "./proofs";

describe("Starlight proof media", () => {
  it("keeps the illustrated entry separate from the fictional sample portrait", () => {
    const proof = proofExperienceForSlug("starlight-pony-dreamscape");

    expect(proof?.sampleCover).toBe(
      "/experiences/starlight-pony-dreamscape-entry.webp",
    );
    expect(proof?.samplePortrait).toBe(
      "/experiences/starlight-pony-dreamscape-sample-toddler.webp",
    );
  });
});
