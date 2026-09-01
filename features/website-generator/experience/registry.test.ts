import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_REGISTRY,
  PROOF_EXPERIENCE_SLUGS,
  resolveExperience,
} from "./registry";

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
    const capiz = resolveExperience("wedding", {
      enabled: true,
      slug: "capiz-window",
    });
    const neon = resolveExperience("debut", {
      enabled: true,
      slug: "neon-eighteen",
    });
    const memorial = resolveExperience("funeral", {
      enabled: true,
      slug: "in-loving-memory",
    });
    const fiesta = resolveExperience("fiesta", {
      enabled: true,
      slug: "fiesta-banderitas",
    });
    const launch = resolveExperience("corporate", {
      enabled: true,
      slug: "product-launch",
    });
    expect(PROOF_EXPERIENCE_SLUGS).toEqual([
      "capiz-window",
      "neon-eighteen",
      "fiesta-banderitas",
      "product-launch",
      "in-loving-memory",
    ]);
    // The two image-led launch experiences deliberately share full-bleed media
    // while their opening language, theme and choreography differ. Memorial
    // remains a restrained arch rather than inheriting either launch hero.
    expect(
      new Set([capiz.layout.hero, neon.layout.hero, memorial.layout.hero]).size,
    ).toBe(2);
    expect(
      new Set([
        capiz.config.motionProfile,
        neon.config.motionProfile,
        memorial.config.motionProfile,
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        capiz.config.visualThemeId,
        neon.config.visualThemeId,
        memorial.config.visualThemeId,
      ]).size,
    ).toBe(3);
    expect(capiz.config.id).toBe("capiz-window-v1");
    expect(neon.config.motionLevel).toBe("M4");
    expect(fiesta.layout.photoShape).toBe("blob");
    expect(fiesta.config.visualThemeId).toBe("festival-pulse");
    expect(launch.layout.sections.slice(0, 4)).toEqual([
      "welcome",
      "countdown",
      "actions",
      "program",
    ]);
    expect(launch.config.visualThemeId).toBe("digital-light");
    expect(memorial.layout.celebratory).toBe(false);
    expect(memorial.layout.sections.slice(0, 3)).toEqual([
      "welcome",
      "venues",
      "program",
    ]);
  });

  it("derives a near-static accessible mode without hiding content", () => {
    const normal = resolveExperience("debut", {
      enabled: true,
      slug: "neon-eighteen",
    });
    const reduced = resolveExperience("debut", {
      enabled: true,
      reducedMotion: true,
      slug: "neon-eighteen",
    });
    expect(reduced.layout.sections).toEqual(normal.layout.sections);
    expect(reduced.motionStyle).toBe("fade");
    expect(reduced.motionLevel).toBe("M0");
  });

  it("resolves every named blueprint experience rather than a category fallback", () => {
    const ivory = resolveExperience("wedding", {
      enabled: true,
      slug: "ivory-lace",
    });
    expect(ivory.config.id).toBe("ivory-lace-v1");
    expect(ivory.config.visualThemeId).toBe("atelier-ivory");
    expect(ivory.config).not.toBe(EXPERIENCE_REGISTRY.wedding);
  });

  it("preserves legacy behavior behind the feature flag", () => {
    const resolved = resolveExperience("fiesta", { enabled: false });
    expect(resolved.source).toBe("legacy");
    expect(resolved.motionStyle).toBe(resolved.layout.motion);
  });
});
