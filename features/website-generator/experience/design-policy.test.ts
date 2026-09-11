import { describe, expect, it } from "vitest";
import {
  designPolicyForSlug,
  enforceTemplatePersonalization,
} from "./design-policy";

describe("template design policy", () => {
  it("makes Starlight a content-only, template-owned experience", () => {
    const policy = designPolicyForSlug("starlight-pony-dreamscape");

    expect(policy.customization).toBe("content-only");
    expect(policy.owns).toEqual(
      expect.arrayContaining([
        "typography",
        "color",
        "theme",
        "motion",
        "components",
        "image-treatment",
        "layout",
      ]),
    );
    expect(policy.personalization).toMatchObject({
      identitySource: "invitation-approved-media",
      clothingTreatment: "template-harmonized",
      sceneIntegration: "contact-depth-light-shadow-overlap",
      providerRequired: true,
    });
  });

  it("keeps existing templates on the guided customization path", () => {
    expect(designPolicyForSlug("capiz-window")).toEqual({
      customization: "guided",
      allowSectionVisibility: true,
      owns: [],
    });
  });

  it("rejects visual overrides at the Starlight write boundary", () => {
    expect(
      enforceTemplatePersonalization("starlight-pony-dreamscape", {
        colorTheme: "midnight-gold",
        typography: "modern-sans",
        backgroundStyle: "soft-gradient",
        decorativeStyle: "floral-corners",
        hiddenSections: ["gifts"],
      }),
    ).toEqual({
      colorTheme: "classic-ivory",
      typography: "classic-serif",
      backgroundStyle: "plain",
      decorativeStyle: "none",
      hiddenSections: ["gifts"],
    });
  });

  it("preserves approved choices for guided templates", () => {
    const choices = {
      colorTheme: "midnight-gold",
      typography: "modern-sans",
      backgroundStyle: "soft-gradient",
      decorativeStyle: "floral-corners",
      hiddenSections: ["gallery"],
    };

    expect(enforceTemplatePersonalization("capiz-window", choices)).toBe(
      choices,
    );
  });
});
