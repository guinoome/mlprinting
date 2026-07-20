import { describe, expect, it } from "vitest";
import { PAGE_SPECS, pageSpecFor, MM_TO_PT } from "./page-specs";

describe("page specs", () => {
  it("sizes 5x7 inches in points", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    expect(spec.trimWidth).toBeCloseTo(360, 1);
    expect(spec.trimHeight).toBeCloseTo(504, 1);
  });

  it("sizes A5 and A6 in points", () => {
    expect(pageSpecFor("A5").trimWidth).toBeCloseTo(419.53, 1);
    expect(pageSpecFor("A5").trimHeight).toBeCloseTo(595.28, 1);
    expect(pageSpecFor("A6").trimWidth).toBeCloseTo(297.64, 1);
    expect(pageSpecFor("A6").trimHeight).toBeCloseTo(419.53, 1);
  });

  it("uses a 3mm bleed on every size", () => {
    for (const spec of Object.values(PAGE_SPECS)) {
      expect(spec.bleed).toBeCloseTo(3 * MM_TO_PT, 2);
    }
  });

  it("makes the media box the trim plus bleed on all four edges", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    expect(spec.mediaWidth).toBeCloseTo(spec.trimWidth + spec.bleed * 2, 2);
    expect(spec.mediaHeight).toBeCloseTo(spec.trimHeight + spec.bleed * 2, 2);
  });

  it("insets the safe area 5mm inside the trim", () => {
    const spec = pageSpecFor("A5");
    const safe = spec.safeBox;
    expect(safe.x).toBeCloseTo(spec.bleed + 5 * MM_TO_PT, 2);
    expect(safe.width).toBeCloseTo(spec.trimWidth - 10 * MM_TO_PT, 2);
  });

  it("puts the trim box inside the media box by exactly the bleed", () => {
    const spec = pageSpecFor("A6");
    expect(spec.trimBox.x).toBeCloseTo(spec.bleed, 2);
    expect(spec.trimBox.width).toBeCloseTo(spec.trimWidth, 2);
  });
});
