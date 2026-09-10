import type { EventKind } from "@/lib/invitation/preview-model";
import { LAYOUTS, layoutFor } from "../layouts/registry";
import type { InvitationLayout } from "../layouts/types";
import { MOTION_PROFILES } from "./profiles";
import { FINAL_50 } from "./final-50";
import type {
  ExperienceConfig,
  InteractionId,
  MotionProfileId,
  ResolvedExperience,
  ResponsiveMediaFocalPoint,
} from "./types";

export const CENTERED_HERO_FOCAL_POINT: ResponsiveMediaFocalPoint = {
  desktop: { x: 50, y: 50 },
  tablet: { x: 50, y: 50 },
  mobile: { x: 50, y: 50 },
};

const PROOF_HERO_FOCAL_POINTS = {
  "capiz-window": {
    desktop: { x: 76, y: 50 },
    tablet: { x: 79, y: 50 },
    mobile: { x: 83, y: 50 },
  },
  "neon-eighteen": {
    desktop: { x: 76, y: 48 },
    tablet: { x: 79, y: 48 },
    mobile: { x: 82, y: 46 },
  },
  "fiesta-banderitas": {
    desktop: { x: 74, y: 48 },
    tablet: { x: 78, y: 48 },
    mobile: { x: 81, y: 46 },
  },
  "product-launch": {
    desktop: { x: 68, y: 52 },
    tablet: { x: 70, y: 52 },
    mobile: { x: 72, y: 52 },
  },
  "ivory-lace": {
    desktop: { x: 68, y: 42 },
    tablet: { x: 74, y: 44 },
    mobile: { x: 80, y: 48 },
  },
  "blush-botanical": {
    desktop: { x: 62, y: 36 },
    tablet: { x: 72, y: 38 },
    mobile: { x: 78, y: 42 },
  },
  "midnight-gold": {
    desktop: { x: 66, y: 40 },
    tablet: { x: 72, y: 42 },
    mobile: { x: 78, y: 46 },
  },
  "starlight-pony-dreamscape": CENTERED_HERO_FOCAL_POINT,
  "in-loving-memory": CENTERED_HERO_FOCAL_POINT,
} satisfies Record<string, ResponsiveMediaFocalPoint>;

const STANDARD_INTERACTIONS: InteractionId[] = [
  "opening-reveal",
  "countdown",
  "music",
  "gallery",
  "programme",
  "map",
  "calendar",
  "rsvp",
  "share",
  "qr",
];

const PROFILE_BY_KIND: Record<EventKind, MotionProfileId> = {
  wedding: "luxury",
  engagement: "elegant",
  debut: "luxury",
  birthday: "playful",
  christening: "elegant",
  "baby-shower": "storybook",
  anniversary: "storybook",
  graduation: "cinematic",
  corporate: "luxury",
  reunion: "storybook",
  family: "tropical",
  fiesta: "tropical",
  religious: "elegant",
  community: "elegant",
  funeral: "elegant",
  general: "elegant",
};

const SIGNATURE_BY_KIND: Record<EventKind, string> = {
  wedding: "An editorial opening turns the ceremony into a shared story.",
  engagement: "A portrait-led reveal opens the couple's next chapter.",
  debut: "Formal choreography frames the celebrant's milestone.",
  birthday:
    "Kinetic type makes the invitation feel like the party has started.",
  christening: "A gentle portrait reveal keeps the ceremony calm and clear.",
  "baby-shower": "A layered card opens into a warm family story.",
  anniversary: "Then-and-now imagery advances through shared years.",
  graduation: "An editorial reveal gives the achievement centre stage.",
  corporate: "Programme and venue details unfold as a formal presentation.",
  reunion: "A photo-led journey reconnects guests through shared memory.",
  family: "A warm gathering story leads guests back to the table.",
  fiesta: "A living festival poster moves with local colour and rhythm.",
  religious: "A restrained invitation prioritizes ceremony and reflection.",
  community:
    "A clear public notice becomes a welcoming digital gathering point.",
  funeral: "A quiet portrait keeps service information effortless to find.",
  general: "A flexible editorial reveal keeps the event itself in focus.",
};

const kinds = Object.keys(LAYOUTS) as EventKind[];

/** One typed configuration seam; no per-experience application forks. */
export const EXPERIENCE_REGISTRY = Object.fromEntries(
  kinds.map((kind) => {
    const layout = LAYOUTS[kind];
    const profile = MOTION_PROFILES[PROFILE_BY_KIND[kind]];
    const config: ExperienceConfig = {
      id: `${kind}-v1`,
      version: 1,
      eventKind: kind,
      layoutId: layout.id,
      visualThemeId: "inherit",
      motionProfile: profile.id,
      interactions: [...STANDARD_INTERACTIONS],
      mediaProfile:
        profile.performanceClass === "cinematic"
          ? "cinematic"
          : layout.photoShape === "rect"
            ? "gallery"
            : "portrait",
      heroFocalPoint: CENTERED_HERO_FOCAL_POINT,
      performanceClass: profile.performanceClass,
      motionLevel: profile.level,
      printCompatible: true,
      signature: SIGNATURE_BY_KIND[kind],
    };
    return [kind, config];
  }),
) as Record<EventKind, ExperienceConfig>;

const PROOF_LAYOUTS: Record<string, InvitationLayout> = {
  "capiz-window": {
    id: "capiz-window-cultural",
    hero: "full-bleed",
    sections: [
      "welcome",
      "countdown",
      "actions",
      "hosts",
      "invitation",
      "venues",
      "program",
      "gallery",
      "dress-code",
      "gifts",
    ],
    ornament: "filigree",
    photoShape: "arch",
    dateStyle: "row",
    motion: "sweep",
    celebratory: true,
  },
  "neon-eighteen": {
    id: "neon-eighteen-nightlife",
    hero: "full-bleed",
    sections: [
      "welcome",
      "countdown",
      "actions",
      "program",
      "hosts",
      "invitation",
      "gallery",
      "venues",
      "dress-code",
    ],
    ornament: "none",
    photoShape: "circle",
    dateStyle: "row",
    motion: "pop",
    celebratory: true,
  },
  "fiesta-banderitas": {
    id: "fiesta-banderitas-street",
    hero: "full-bleed",
    sections: [
      "welcome",
      "countdown",
      "actions",
      "program",
      "invitation",
      "venues",
      "gallery",
      "hosts",
      "dress-code",
    ],
    ornament: "confetti",
    photoShape: "blob",
    dateStyle: "row",
    motion: "pop",
    celebratory: true,
  },
  "product-launch": {
    id: "product-launch-keynote",
    hero: "full-bleed",
    sections: [
      "welcome",
      "countdown",
      "actions",
      "program",
      "invitation",
      "venues",
      "gallery",
    ],
    ornament: "none",
    photoShape: "rect",
    dateStyle: "line",
    motion: "sweep",
    celebratory: false,
  },
  "in-loving-memory": {
    id: "in-loving-memory-tribute",
    hero: "arch-portrait",
    sections: [
      "welcome",
      "venues",
      "program",
      "invitation",
      "hosts",
      "gallery",
      "notes",
    ],
    ornament: "none",
    photoShape: "oval",
    dateStyle: "line",
    motion: "fade",
    celebratory: false,
  },
  "ivory-lace": {
    id: "ivory-lace-editorial",
    hero: "full-bleed",
    sections: [
      "welcome",
      "hosts",
      "invitation",
      "countdown",
      "actions",
      "venues",
      "program",
      "gallery",
      "dress-code",
      "gifts",
    ],
    ornament: "filigree",
    photoShape: "arch",
    dateStyle: "row",
    motion: "sweep",
    celebratory: true,
  },
  "blush-botanical": {
    id: "blush-botanical-garden",
    hero: "photo-band",
    sections: [
      "welcome",
      "hosts",
      "gallery",
      "invitation",
      "venues",
      "countdown",
      "program",
      "actions",
      "dress-code",
      "gifts",
    ],
    ornament: "floral",
    photoShape: "blob",
    dateStyle: "line",
    motion: "rise",
    celebratory: true,
  },
  "midnight-gold": {
    id: "midnight-gold-evening",
    hero: "card-on-photo",
    sections: [
      "welcome",
      "countdown",
      "venues",
      "program",
      "invitation",
      "actions",
      "gallery",
      "dress-code",
      "gifts",
    ],
    ornament: "filigree",
    photoShape: "rect",
    dateStyle: "line",
    motion: "sweep",
    celebratory: true,
  },
  "starlight-pony-dreamscape": {
    id: "starlight-pony-dreamscape-story",
    hero: "full-bleed",
    sections: [
      "welcome",
      "countdown",
      "actions",
      "gallery",
      "invitation",
      "venues",
      "program",
      "dress-code",
      "gifts",
    ],
    ornament: "confetti",
    photoShape: "blob",
    dateStyle: "row",
    motion: "rise",
    celebratory: true,
  },
};

const PROOF_EXPERIENCES: Record<string, ExperienceConfig> = {
  "capiz-window": {
    id: "capiz-window-v1",
    version: 1,
    slug: "capiz-window",
    eventKind: "wedding",
    layoutId: PROOF_LAYOUTS["capiz-window"].id,
    visualThemeId: "capiz-luminous",
    motionProfile: "mp-14-cultural-ceremony",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "portrait",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["capiz-window"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "Light travels through layered capiz panes before revealing the couple and ceremony.",
  },
  "neon-eighteen": {
    id: "neon-eighteen-v1",
    version: 1,
    slug: "neon-eighteen",
    eventKind: "debut",
    layoutId: PROOF_LAYOUTS["neon-eighteen"].id,
    visualThemeId: "neon-nightlife",
    motionProfile: "mp-09-neon-pulse",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "cinematic",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["neon-eighteen"],
    performanceClass: "cinematic",
    motionLevel: "M4",
    printCompatible: false,
    signature: "The debut feels like entering a live nightlife event.",
  },
  "fiesta-banderitas": {
    id: "fiesta-banderitas-v1",
    version: 1,
    slug: "fiesta-banderitas",
    eventKind: "fiesta",
    layoutId: PROOF_LAYOUTS["fiesta-banderitas"].id,
    visualThemeId: "festival-pulse",
    motionProfile: "mp-10-live-event",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "cinematic",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["fiesta-banderitas"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "Banderitas sweep across a living Cebu street before the programme unfolds.",
  },
  "product-launch": {
    id: "product-launch-v1",
    version: 1,
    slug: "product-launch",
    eventKind: "corporate",
    layoutId: PROOF_LAYOUTS["product-launch"].id,
    visualThemeId: "digital-light",
    motionProfile: "mp-11-product",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "cinematic",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["product-launch"],
    performanceClass: "cinematic",
    motionLevel: "M4",
    printCompatible: true,
    signature:
      "A keynote-style reveal moves from proposition to programme and registration.",
  },
  "in-loving-memory": {
    id: "in-loving-memory-v1",
    version: 1,
    slug: "in-loving-memory",
    eventKind: "funeral",
    layoutId: PROOF_LAYOUTS["in-loving-memory"].id,
    visualThemeId: "memorial-quiet",
    motionProfile: "mp-12-quiet-tribute",
    interactions: [
      "opening-reveal",
      "gallery",
      "programme",
      "map",
      "calendar",
      "rsvp",
      "share",
      "qr",
    ],
    mediaProfile: "portrait",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["in-loving-memory"],
    performanceClass: "light",
    motionLevel: "M2",
    printCompatible: true,
    signature:
      "A quiet portrait preserves dignity while service information remains effortless to find.",
  },
  "ivory-lace": {
    id: "ivory-lace-v1",
    version: 1,
    slug: "ivory-lace",
    eventKind: "wedding",
    layoutId: PROOF_LAYOUTS["ivory-lace"].id,
    visualThemeId: "atelier-ivory",
    motionProfile: "mp-01-editorial",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "portrait",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["ivory-lace"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "Lace shadows lift like a veil before a restrained couture ceremony unfolds.",
  },
  "blush-botanical": {
    id: "blush-botanical-v1",
    version: 1,
    slug: "blush-botanical",
    eventKind: "wedding",
    layoutId: PROOF_LAYOUTS["blush-botanical"].id,
    visualThemeId: "botanical-romance",
    motionProfile: "mp-06-botanical",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "gallery",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["blush-botanical"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "Pressed botanicals open into a garden journey led by portrait, place, and vows.",
  },
  "midnight-gold": {
    id: "midnight-gold-v1",
    version: 1,
    slug: "midnight-gold",
    eventKind: "wedding",
    layoutId: PROOF_LAYOUTS["midnight-gold"].id,
    visualThemeId: "midnight-metallic",
    motionProfile: "mp-02-luxe-reveal",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "cinematic",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["midnight-gold"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "Midnight panels part into a candlelit programme with disciplined metallic rhythm.",
  },
  "starlight-pony-dreamscape": {
    id: "starlight-pony-dreamscape-v1",
    version: 1,
    slug: "starlight-pony-dreamscape",
    eventKind: "birthday",
    layoutId: PROOF_LAYOUTS["starlight-pony-dreamscape"].id,
    visualThemeId: "starlight-dreamscape",
    motionProfile: "storybook",
    interactions: [...STANDARD_INTERACTIONS],
    mediaProfile: "portrait",
    heroFocalPoint: PROOF_HERO_FOCAL_POINTS["starlight-pony-dreamscape"],
    performanceClass: "standard",
    motionLevel: "M3",
    printCompatible: true,
    signature:
      "A real celebrant portrait enters a luminous pony dreamscape while the invitation stays live, editable, and unmistakably theirs.",
  },
};

const FINAL_50_EXPERIENCES = Object.fromEntries(
  FINAL_50.map((entry) => {
    const interactions =
      entry.motionProfile === "mp-12-quiet"
        ? STANDARD_INTERACTIONS.filter(
            (interaction) =>
              interaction !== "music" && interaction !== "countdown",
          )
        : [...STANDARD_INTERACTIONS];
    const config: ExperienceConfig = {
      id: `${entry.slug}-v1`,
      version: 1,
      slug: entry.slug,
      eventKind: entry.eventKind,
      layoutId: layoutFor(entry.eventKind).id,
      visualThemeId: entry.visualThemeId,
      motionProfile: entry.motionProfile,
      interactions,
      mediaProfile:
        entry.performanceClass === "cinematic" ? "cinematic" : "portrait",
      heroFocalPoint: CENTERED_HERO_FOCAL_POINT,
      performanceClass: entry.performanceClass,
      motionLevel: entry.motionLevel,
      printCompatible: entry.visualThemeId !== "neon-nightlife",
      signature: entry.signature,
    };
    return [entry.slug, config];
  }),
) as Record<string, ExperienceConfig>;

export const PROOF_EXPERIENCE_SLUGS = Object.freeze(
  Object.keys(PROOF_EXPERIENCES),
);

export function experienceConfigFor(
  kind: EventKind,
  slug?: string | null,
): ExperienceConfig {
  return (
    (slug && (PROOF_EXPERIENCES[slug] || FINAL_50_EXPERIENCES[slug])) ||
    EXPERIENCE_REGISTRY[kind]
  );
}

export function resolveExperience(
  kind: EventKind,
  options: {
    enabled: boolean;
    reducedMotion?: boolean;
    slug?: string | null;
  },
): ResolvedExperience {
  const config = experienceConfigFor(kind, options.slug);
  const layout =
    (config.slug && PROOF_LAYOUTS[config.slug]) || layoutFor(config.eventKind);
  const reducedMotion = options.reducedMotion === true;
  const profile = MOTION_PROFILES[config.motionProfile];

  return {
    config,
    layout,
    motionStyle: options.enabled
      ? reducedMotion
        ? profile.reduced
        : profile.normal
      : layout.motion,
    motionLevel: options.enabled
      ? reducedMotion
        ? "M0"
        : config.motionLevel
      : "M0",
    reducedMotion,
    source: options.enabled ? "experience" : "legacy",
  };
}
