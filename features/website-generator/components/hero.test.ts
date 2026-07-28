import { describe, expect, it } from "vitest";
import { HERO_COMPONENTS, isOverPhoto } from "./hero";
import { LAYOUTS } from "../layouts/registry";
import type { HeroPresentation } from "../layouts/types";

const OCCASIONS = Object.entries(LAYOUTS);

describe("hero presentations", () => {
  /**
   * The regression this increment exists to prevent.
   *
   * Before it, all sixteen occasions declared a hero in the layout registry and
   * the renderer drew the same full-bleed one for every single of them — the
   * seam was read and then ignored. A declared presentation with no component
   * behind it is that bug returning.
   */
  it("renders every presentation the registry declares", () => {
    for (const [kind, layout] of OCCASIONS) {
      expect(
        HERO_COMPONENTS[layout.hero],
        `${kind} declares hero "${layout.hero}" with nothing to draw it`,
      ).toBeTypeOf("function");
    }
  });

  it("draws each presentation with a different component", () => {
    const components = Object.values(HERO_COMPONENTS);
    expect(new Set(components).size).toBe(components.length);
  });

  it("puts more than one presentation to work across the library", () => {
    // Sixteen occasions all resolving to one component would satisfy the test
    // above and still be the thing being fixed.
    const used = new Set(OCCASIONS.map(([, l]) => l.hero));
    expect(used.size).toBeGreaterThanOrEqual(5);
  });
});

describe("isOverPhoto", () => {
  it("names the two presentations that set type over a photograph", () => {
    expect(isOverPhoto("full-bleed")).toBe(true);
    expect(isOverPhoto("card-on-photo")).toBe(true);
  });

  it("treats the rest as sitting on the invitation's own paper", () => {
    for (const presentation of [
      "arch-portrait",
      "photo-band",
      "type-led",
      "flat-bold",
      "photo-grid",
    ] as HeroPresentation[]) {
      expect(isOverPhoto(presentation), presentation).toBe(false);
    }
  });

  it("classifies every presentation", () => {
    for (const presentation of Object.keys(
      HERO_COMPONENTS,
    ) as HeroPresentation[]) {
      expect(typeof isOverPhoto(presentation)).toBe("boolean");
    }
  });

  /**
   * A memorial, a mass and a barangay notice must not open with a photograph
   * filling the screen under a dark scrim. That treatment is cinematic — it is
   * right for a wedding and wrong for a funeral, and the difference is not a
   * matter of taste but of what the page is for.
   */
  it("keeps the solemn occasions off the full-screen photographic treatment", () => {
    for (const kind of ["funeral", "religious", "community"] as const) {
      expect(
        isOverPhoto(LAYOUTS[kind].hero),
        `${kind} opens with a full-screen scrimmed photograph`,
      ).toBe(false);
    }
  });
});
