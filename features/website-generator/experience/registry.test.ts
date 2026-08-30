import { describe, expect, it } from "vitest";
import { EXPERIENCE_REGISTRY, resolveExperience } from "./registry";

describe("experience resolver", () => {
  it("defines a complete configuration for every existing occasion", () => {
    expect(Object.keys(EXPERIENCE_REGISTRY)).toHaveLength(16);
    for (const config of Object.values(EXPERIENCE_REGISTRY)) {
      expect(config.layoutId).toBeTruthy();
      expect(config.interactions).toContain("rsvp");
      expect(config.interactions).toContain("qr");
      expect(config.signature.length).toBeGreaterThan(24);
    }
  });

  it("proves materially different experiences through one resolver", () => {
    const capizLike = resolveExperience("wedding", { enabled: true });
    const neonLike = resolveExperience("birthday", { enabled: true });
    const memorial = resolveExperience("funeral", { enabled: true });
    expect(
      new Set([
        capizLike.layout.hero,
        neonLike.layout.hero,
        memorial.layout.hero,
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        capizLike.config.motionProfile,
        neonLike.config.motionProfile,
        memorial.config.motionProfile,
      ]).size,
    ).toBe(3);
    expect(memorial.layout.celebratory).toBe(false);
  });

  it("derives a near-static accessible mode without hiding content", () => {
    const normal = resolveExperience("birthday", { enabled: true });
    const reduced = resolveExperience("birthday", {
      enabled: true,
      reducedMotion: true,
    });
    expect(reduced.layout.sections).toEqual(normal.layout.sections);
    expect(reduced.motionStyle).toBe("fade");
    expect(reduced.motionLevel).toBe("M0");
  });

  it("preserves legacy behavior behind the feature flag", () => {
    const resolved = resolveExperience("fiesta", { enabled: false });
    expect(resolved.source).toBe("legacy");
    expect(resolved.motionStyle).toBe(resolved.layout.motion);
  });
});
