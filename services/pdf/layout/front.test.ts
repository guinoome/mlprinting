import { describe, expect, it } from "vitest";
import { layoutFront } from "./front";
import { pageSpecFor } from "../page-specs";
import { printColours } from "../colour";

const measure = (text: string, size: number) => text.length * size * 0.5;

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    colours: printColours("classic-ivory"),
    measure,
    title: "Ana & Ben",
    subtitle: null,
    dateLine: "Saturday, 14 March 2027",
    timeLine: "3:00 PM",
    hostNames: ["Ana Santos", "Ben Cruz"],
    invitationMessage: "Together with our families, we invite you.",
    venueLines: ["Basilica del Santo Niño", "Cebu City"],
    coverAssetId: null as string | null,
    hidden: new Set<string>(),
    ...over,
  };
}

describe("layoutFront", () => {
  it("fills the whole media box with the background, edge to edge", () => {
    const { instructions } = layoutFront(input());
    const bg = instructions.find((i) => i.kind === "rect");
    expect(bg).toBeDefined();
    if (bg?.kind !== "rect") throw new Error("expected a rect");
    expect(bg.box.x).toBe(0);
    expect(bg.box.y).toBe(0);
    expect(bg.box.width).toBeCloseTo(pageSpecFor("FIVE_BY_SEVEN").mediaWidth, 2);
  });

  it("draws the title", () => {
    const { instructions } = layoutFront(input());
    const texts = instructions.filter((i) => i.kind === "text");
    expect(
      texts.some((t) => t.kind === "text" && t.text.includes("Ana & Ben")),
    ).toBe(true);
  });

  it("keeps every text instruction inside the safe area", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    const { instructions } = layoutFront(input());
    for (const i of instructions) {
      if (i.kind !== "text") continue;
      expect(i.x).toBeGreaterThanOrEqual(spec.safeBox.x - 0.01);
      expect(i.y).toBeGreaterThanOrEqual(spec.safeBox.y - 0.01);
    }
  });

  it("omits hosts when the customer hid that section", () => {
    const { instructions } = layoutFront(input({ hidden: new Set(["hosts"]) }));
    expect(
      instructions.some(
        (i) => i.kind === "text" && i.text.includes("Ana Santos"),
      ),
    ).toBe(false);
  });

  it("emits a full-bleed image instruction when a cover asset is present", () => {
    const { instructions } = layoutFront(input({ coverAssetId: "asset-1" }));
    const image = instructions.find((i) => i.kind === "image");
    expect(image).toBeDefined();
    if (image?.kind !== "image") throw new Error("expected an image");
    expect(image.assetId).toBe("asset-1");
  });

  it("reports overflow rather than silently clipping", () => {
    const result = layoutFront(
      input({ invitationMessage: "word ".repeat(4000).trim() }),
    );
    expect(result.overflows.length).toBeGreaterThan(0);
  });
});
