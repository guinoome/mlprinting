import { describe, expect, it } from "vitest";
import { layoutBack } from "./back";
import { pageSpecFor } from "../page-specs";
import { printColours } from "../colour";

const measure = (text: string, size: number) => text.length * size * 0.5;

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    colours: printColours("classic-ivory"),
    measure,
    parents: ["Rosa Santos", "Mario Santos"],
    sponsors: ["Luis Reyes", "Elena Cruz"],
    programme: [{ time: "3:00 PM", title: "Ceremony" }],
    dressCode: "Formal",
    giftsPreference: null as string | null,
    specialNotes: null as string | null,
    rsvpLine: "Kindly reply by 14 February 2027",
    hidden: new Set<string>(),
    ...over,
  };
}

describe("layoutBack", () => {
  it("reports empty when every section is hidden", () => {
    const result = layoutBack(
      input({
        hidden: new Set([
          "parents",
          "sponsors",
          "program",
          "dress-code",
          "gifts",
          "notes",
          "rsvp",
        ]),
      }),
    );
    expect(result.isEmpty).toBe(true);
  });

  it("reports empty when there is simply no content", () => {
    const result = layoutBack(
      input({
        parents: [],
        sponsors: [],
        programme: [],
        dressCode: null,
        rsvpLine: null,
      }),
    );
    expect(result.isEmpty).toBe(true);
  });

  it("is not empty when at least one section has content", () => {
    expect(layoutBack(input()).isEmpty).toBe(false);
  });

  it("draws the background even when content exists", () => {
    const { instructions } = layoutBack(input());
    expect(instructions.some((i) => i.kind === "rect")).toBe(true);
  });

  it("omits sponsors when that section is hidden", () => {
    const { instructions } = layoutBack(
      input({ hidden: new Set(["sponsors"]) }),
    );
    expect(
      instructions.some(
        (i) => i.kind === "text" && i.text.includes("Luis Reyes"),
      ),
    ).toBe(false);
  });

  it("keeps text inside the safe area", () => {
    const spec = pageSpecFor("FIVE_BY_SEVEN");
    const { instructions } = layoutBack(input());
    for (const i of instructions) {
      if (i.kind !== "text") continue;
      expect(i.y).toBeGreaterThanOrEqual(spec.safeBox.y - 0.01);
    }
  });
});
