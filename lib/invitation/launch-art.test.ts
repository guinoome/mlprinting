import { describe, expect, it } from "vitest";
import { launchArtworkForSlug } from "./launch-art";

describe("launch artwork", () => {
  it.each([
    [
      "capiz-window",
      "/experiences/capiz-window-catalogue.png",
      "/experiences/capiz-window-hero.png",
    ],
    [
      "neon-eighteen",
      "/experiences/neon-eighteen-catalogue.png",
      "/experiences/neon-eighteen-hero.png",
    ],
    [
      "fiesta-banderitas",
      "/experiences/fiesta-banderitas-catalogue.png",
      "/experiences/fiesta-banderitas-hero.png",
    ],
    [
      "product-launch",
      "/experiences/product-launch-catalogue.png",
      "/experiences/product-launch-catalogue.png",
    ],
  ])(
    "separates %s catalogue and interactive artwork",
    (slug, catalogueSrc, heroSrc) => {
      expect(launchArtworkForSlug(slug)).toMatchObject({
        catalogueSrc,
        heroSrc,
      });
    },
  );

  it("does not replace unfinished catalogue artwork", () => {
    expect(launchArtworkForSlug("ivory-lace")).toBeNull();
  });
});
