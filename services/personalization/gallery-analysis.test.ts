import { describe, expect, it } from "vitest";
import { rankPersonalizationCandidates } from "./gallery-analysis";

const assets = [
  {
    id: "current-child",
    originalFilename: "mary-birthday-portrait.jpg",
    tags: ["celebrant"],
    width: 1800,
    height: 2400,
  },
  {
    id: "other-project-child",
    originalFilename: "other-child.jpg",
    tags: ["celebrant"],
    width: 2000,
    height: 2600,
  },
  {
    id: "current-wide",
    originalFilename: "party-room.jpg",
    tags: ["venue"],
    width: 2200,
    height: 1200,
  },
];

describe("Starlight gallery analysis", () => {
  it("never ranks a profile asset outside the current invitation", () => {
    const ranked = rankPersonalizationCandidates(
      assets,
      new Set(["current-child", "current-wide"]),
    );
    expect(ranked.map((item) => item.asset.id)).not.toContain(
      "other-project-child",
    );
  });

  it("prefers a labelled portrait but still requires confirmation", () => {
    const ranked = rankPersonalizationCandidates(
      assets,
      new Set(["current-child", "current-wide"]),
    );
    expect(ranked[0]?.asset.id).toBe("current-child");
    expect(ranked[0]?.confirmationRequired).toBe(true);
  });
});
