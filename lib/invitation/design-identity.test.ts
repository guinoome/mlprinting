import { describe, expect, it } from "vitest";
import { DESIGN_DEFAULTS } from "@/lib/config/design-vocabulary";
import { resolveDesignIdentity } from "./design-identity";

describe("resolveDesignIdentity", () => {
  it("resolves one semantic choice into coordinated screen and press values", () => {
    const identity = resolveDesignIdentity({
      colorTheme: "midnight-navy",
      typography: "editorial-mix",
      backgroundStyle: "bordered",
      decorativeStyle: "geometric",
    });
    expect(identity.colorThemeSlug).toBe("midnight-navy");
    expect(identity.screen.background).toBe("#1f2937");
    expect(identity.print.background).toEqual([0.44, 0.25, 0, 0.78]);
    expect(identity.typographySlug).toBe("editorial-mix");
  });

  it("falls back as one unit when persisted slugs are unknown", () => {
    const identity = resolveDesignIdentity({
      colorTheme: "unknown",
      typography: "unknown",
      backgroundStyle: "unknown",
      decorativeStyle: "unknown",
    });
    expect(identity.colorThemeSlug).toBe(DESIGN_DEFAULTS.colorTheme);
    expect(identity.typographySlug).toBe(DESIGN_DEFAULTS.typography);
    expect(identity.backgroundStyle).toBe(DESIGN_DEFAULTS.backgroundStyle);
    expect(identity.decorativeStyle).toBe(DESIGN_DEFAULTS.decorativeStyle);
  });
});
