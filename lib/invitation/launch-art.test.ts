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
    [
      "ivory-lace",
      "/experiences/ivory-lace-hero.png",
      "/experiences/ivory-lace-hero.png",
    ],
    [
      "blush-botanical",
      "/experiences/blush-botanical-hero.png",
      "/experiences/blush-botanical-hero.png",
    ],
    [
      "midnight-gold",
      "/experiences/midnight-gold-hero.png",
      "/experiences/midnight-gold-hero.png",
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
    expect(launchArtworkForSlug("coastal-linen")).toBeNull();
  });
});
