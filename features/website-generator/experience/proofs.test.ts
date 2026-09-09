import { describe, expect, it } from "vitest";
import { experienceConfigFor } from "./registry";
import { PROOF_EXPERIENCES, proofExperienceForSlug } from "./proofs";

describe("proof experience index", () => {
  it("keeps every public proof aligned with an exact renderer config", () => {
    for (const proof of PROOF_EXPERIENCES) {
      const config = experienceConfigFor(proof.eventKind, proof.slug);

      expect(config.slug).toBe(proof.slug);
      expect(config.eventKind).toBe(proof.eventKind);
      expect(config.motionLevel).toBe(proof.motionLevel);
      expect(config.motionProfile).toContain(proof.motionProfile.slice(3));
    }
  });

  it("does not pretend an arbitrary template is one of the proofs", () => {
    expect(proofExperienceForSlug("coastal-linen")).toBeNull();
    expect(proofExperienceForSlug(undefined)).toBeNull();
  });
});
