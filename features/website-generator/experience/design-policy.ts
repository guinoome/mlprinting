/**
 * Template ownership rules for the invitation builder and renderers.
 *
 * Event content remains in PreviewModel. This policy says who owns the visual
 * decisions around that content, so a template-led experience cannot quietly
 * fall back to generic colour, font, motion, or layout controls.
 */
import { DESIGN_DEFAULTS } from "@/lib/config/design-vocabulary";

export interface TemplateDesignPolicy {
  customization: "guided" | "content-only";
  allowSectionVisibility: boolean;
  owns: readonly (
    | "typography"
    | "color"
    | "theme"
    | "motion"
    | "components"
    | "image-treatment"
    | "layout"
  )[];
  personalization?: {
    identitySource: "invitation-approved-media";
    preserve: readonly [
      "face",
      "head-proportions",
      "body-proportions",
      "apparent-age",
      "skin-tone",
      "hairline",
      "hairstyle",
    ];
    clothingTreatment: "template-harmonized";
    sceneIntegration: "contact-depth-light-shadow-overlap";
    providerRequired: true;
  };
}

const GUIDED_POLICY: TemplateDesignPolicy = {
  customization: "guided",
  allowSectionVisibility: true,
  owns: [],
};

const STARLIGHT_POLICY: TemplateDesignPolicy = {
  customization: "content-only",
  allowSectionVisibility: true,
  owns: [
    "typography",
    "color",
    "theme",
    "motion",
    "components",
    "image-treatment",
    "layout",
  ],
  personalization: {
    identitySource: "invitation-approved-media",
    preserve: [
      "face",
      "head-proportions",
      "body-proportions",
      "apparent-age",
      "skin-tone",
      "hairline",
      "hairstyle",
    ],
    clothingTreatment: "template-harmonized",
    sceneIntegration: "contact-depth-light-shadow-overlap",
    providerRequired: true,
  },
};

const TEMPLATE_POLICIES: Readonly<Record<string, TemplateDesignPolicy>> = {
  "starlight-pony-dreamscape": STARLIGHT_POLICY,
};

export function designPolicyForSlug(
  slug?: string | null,
): TemplateDesignPolicy {
  return (slug && TEMPLATE_POLICIES[slug]) || GUIDED_POLICY;
}

interface PersonalizationValues {
  colorTheme: string;
  typography: string;
  backgroundStyle: string;
  decorativeStyle: string;
  hiddenSections: string[];
}

/**
 * Enforce template ownership at the write boundary, not only in the UI.
 * A crafted form submission therefore cannot replace Starlight's visual DNA.
 */
export function enforceTemplatePersonalization(
  templateSlug: string | null | undefined,
  values: PersonalizationValues,
): PersonalizationValues {
  if (designPolicyForSlug(templateSlug).customization === "guided") {
    return values;
  }

  return {
    ...DESIGN_DEFAULTS,
    hiddenSections: [...values.hiddenSections],
  };
}
