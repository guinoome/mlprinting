import type { EventKind } from "@/lib/invitation/preview-model";
import type { InvitationLayout, MotionStyle } from "../layouts/types";

export type MotionProfileId =
  | "elegant"
  | "cinematic"
  | "luxury"
  | "playful"
  | "neon"
  | "tropical"
  | "storybook"
  | "mp-09-neon-pulse"
  | "mp-12-quiet-tribute"
  | "mp-14-cultural-ceremony";

export type VisualThemeId =
  "inherit" | "capiz-luminous" | "neon-nightlife" | "memorial-quiet";

export type InteractionId =
  | "opening-reveal"
  | "countdown"
  | "music"
  | "gallery"
  | "programme"
  | "map"
  | "calendar"
  | "rsvp"
  | "share"
  | "qr";

export type PerformanceClass = "light" | "standard" | "cinematic";
export type MotionLevel = "M0" | "M2" | "M3" | "M4";

/**
 * Presentation-only configuration. Event content never enters this object.
 * A template can select one of these values without gaining arbitrary CSS or
 * animation controls.
 */
export interface ExperienceConfig {
  id: string;
  version: 1;
  eventKind: EventKind;
  /** Seed/template slug for a named experience; absent on occasion fallbacks. */
  slug?: string;
  layoutId: string;
  visualThemeId: VisualThemeId;
  motionProfile: MotionProfileId;
  interactions: InteractionId[];
  mediaProfile: "portrait" | "gallery" | "cinematic";
  performanceClass: PerformanceClass;
  motionLevel: Exclude<MotionLevel, "M0">;
  printCompatible: boolean;
  signature: string;
}

export interface ResolvedExperience {
  config: ExperienceConfig;
  layout: InvitationLayout;
  motionStyle: MotionStyle;
  motionLevel: MotionLevel;
  reducedMotion: boolean;
  source: "legacy" | "experience";
}
