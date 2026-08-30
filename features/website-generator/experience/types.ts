import type { EventKind } from "@/lib/invitation/preview-model";
import type { InvitationLayout, MotionStyle } from "../layouts/types";

export type MotionProfileId =
  | "elegant"
  | "cinematic"
  | "luxury"
  | "playful"
  | "neon"
  | "tropical"
  | "storybook";

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
  layoutId: string;
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
