import type { EventKind } from "@/lib/invitation/preview-model";
import { LAYOUTS, layoutFor } from "../layouts/registry";
import { MOTION_PROFILES } from "./profiles";
import type {
  ExperienceConfig,
  InteractionId,
  MotionProfileId,
  ResolvedExperience,
} from "./types";

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
      motionProfile: profile.id,
      interactions: [...STANDARD_INTERACTIONS],
      mediaProfile:
        profile.performanceClass === "cinematic"
          ? "cinematic"
          : layout.photoShape === "rect"
            ? "gallery"
            : "portrait",
      performanceClass: profile.performanceClass,
      motionLevel: profile.level,
      printCompatible: true,
      signature: SIGNATURE_BY_KIND[kind],
    };
    return [kind, config];
  }),
) as Record<EventKind, ExperienceConfig>;

export function resolveExperience(
  kind: EventKind,
  options: { enabled: boolean; reducedMotion?: boolean },
): ResolvedExperience {
  const layout = layoutFor(kind);
  const config = EXPERIENCE_REGISTRY[kind] ?? EXPERIENCE_REGISTRY.general;
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
