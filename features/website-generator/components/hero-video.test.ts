import { describe, expect, it } from "vitest";
import { heroVideoPolicy } from "./hero-video";

describe("heroVideoPolicy", () => {
  it("plays for a guest who has asked for neither restraint", () => {
    expect(heroVideoPolicy({ reducedMotion: false, saveData: false })).toEqual({
      autoplay: true,
      reason: "ok",
    });
  });

  /**
   * The accessibility rule, and the reason the element carries no `autoplay`
   * attribute: markup starts playing before any script can decide not to, so
   * the decision has to live where it can be made.
   */
  it("never starts itself for a guest who asked for reduced motion", () => {
    expect(
      heroVideoPolicy({ reducedMotion: true, saveData: false }).autoplay,
    ).toBe(false);
  });

  it("does not spend a metered connection on decoration", () => {
    const policy = heroVideoPolicy({ reducedMotion: false, saveData: true });
    expect(policy.autoplay).toBe(false);
    expect(policy.reason).toBe("save-data");
  });

  /**
   * Both at once reports reduced motion, because that is the reason that would
   * still hold on unmetered wifi. The outcome is the same either way; the
   * ordering only matters for the explanation.
   */
  it("reports the reason that outlives the other", () => {
    expect(heroVideoPolicy({ reducedMotion: true, saveData: true })).toEqual({
      autoplay: false,
      reason: "reduced-motion",
    });
  });

  it("only ever reports ok when it is actually going to play", () => {
    for (const reducedMotion of [true, false]) {
      for (const saveData of [true, false]) {
        const policy = heroVideoPolicy({ reducedMotion, saveData });
        expect(policy.autoplay, `${reducedMotion}/${saveData}`).toBe(
          policy.reason === "ok",
        );
      }
    }
  });
});
