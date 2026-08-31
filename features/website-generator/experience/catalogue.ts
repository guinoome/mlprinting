import { TEMPLATES, type SeedTemplate } from "@/prisma/seed-data";
import type { EventKind } from "@/lib/invitation/preview-model";
import { experienceConfigFor } from "./registry";

export type CatalogueAction =
  "KEEP" | "ENHANCE" | "REDESIGN" | "MERGE" | "REPOSITION" | "RETIRE";
export interface DesignEvolutionMetadata {
  slug: string;
  name: string;
  experienceFamily: string;
  eventCompatibility: EventKind[];
  visualIdentity: string;
  layoutProfile: string;
  motionProfile: string;
  interactionProfile: string[];
  mediaTreatment: string;
  optionalModules: string[];
  digitalPrintCompatibility: "digital-print" | "digital-only" | "print-only";
  commercialTier: "FREE" | "PREMIUM";
  performanceClass: string;
  motionLevel: string;
  experienceSignature: string;
  action: CatalogueAction;
}
const ACTION_BY_SLUG: Record<string, CatalogueAction> = {
  "ivory-lace": "ENHANCE",
  "blush-botanical": "ENHANCE",
  "midnight-gold": "ENHANCE",
  "coastal-linen": "ENHANCE",
  "gilded-vow": "ENHANCE",
  sampaguita: "KEEP",
  "two-of-us": "ENHANCE",
  "capiz-window": "KEEP",
  "confetti-pop": "ENHANCE",
  "first-year": "ENHANCE",
  "cake-smash": "ENHANCE",
  "golden-sixty": "ENHANCE",
  "seventh-heaven": "ENHANCE",
  "neon-eighteen": "KEEP",
  "eighteen-roses": "KEEP",
  "cotillion-waltz": "KEEP",
  sagala: "KEEP",
  "blue-hour": "ENHANCE",
  "little-dove": "ENHANCE",
  "sacred-olive": "REPOSITION",
  "sunday-best": "ENHANCE",
  "little-bloom": "ENHANCE",
  "sweet-pea": "ENHANCE",
  "sweet-dreams": "ENHANCE",
  "golden-jubilee": "KEEP",
  "paper-anniversary": "ENHANCE",
  "still-us": "ENHANCE",
  "toga-and-tassel": "REDESIGN",
  "summa-minimal": "MERGE",
  sablay: "KEEP",
  "quarterly-gala": "ENHANCE",
  "product-launch": "KEEP",
  "boardroom-black": "ENHANCE",
  "noche-buena": "ENHANCE",
  "handaan-sa-bahay": "REPOSITION",
  "bahay-kubo": "KEEP",
  "fiesta-banderitas": "KEEP",
  "santo-patron": "ENHANCE",
  "reunion-table": "ENHANCE",
  "class-of-then": "KEEP",
  "sealed-with-yes": "ENHANCE",
  "long-engagement": "MERGE",
  "paper-lanterns": "ENHANCE",
  "salamat-sa-biyaya": "ENHANCE",
  "flores-de-mayo": "KEEP",
  "barangay-assembly": "REPOSITION",
  "sinulog-street": "KEEP",
  "in-loving-memory": "KEEP",
  "eternal-olive": "ENHANCE",
  "parol-lights": "REPOSITION",
  "draft-preview-only": "RETIRE",
};
const kindFor = (category: string): EventKind =>
  category === "custom" ? "general" : (category as EventKind);
function compatibilityFor(template: SeedTemplate) {
  if (template.printCompatible && template.websiteCompatible)
    return "digital-print" as const;
  return template.websiteCompatible
    ? ("digital-only" as const)
    : ("print-only" as const);
}
export function catalogueMetadataFor(
  template: SeedTemplate,
): DesignEvolutionMetadata {
  const action = ACTION_BY_SLUG[template.slug];
  if (!action) throw new Error(`Missing evolution action for ${template.slug}`);
  const eventKind = kindFor(template.category);
  const experience = experienceConfigFor(eventKind, template.slug);
  return {
    slug: template.slug,
    name: template.name,
    experienceFamily: `${eventKind}-${experience.motionProfile}`,
    eventCompatibility: [eventKind],
    visualIdentity: `${template.styles.join(" / ")} · ${template.colors.join(" / ")}`,
    layoutProfile: experience.layoutId,
    motionProfile: experience.motionProfile,
    interactionProfile: [...experience.interactions],
    mediaTreatment: experience.mediaProfile,
    optionalModules: [...template.features],
    digitalPrintCompatibility: compatibilityFor(template),
    commercialTier: template.tier,
    performanceClass: experience.performanceClass,
    motionLevel: experience.motionLevel,
    experienceSignature: experience.signature,
    action,
  };
}
export const DESIGN_EVOLUTION_MATRIX = TEMPLATES.filter(
  (template) => template.publishedDaysAgo >= 0,
).map(catalogueMetadataFor);
export const CATALOGUE_ACTION_SLUGS = Object.freeze(
  Object.keys(ACTION_BY_SLUG),
);
