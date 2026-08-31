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
  | "mp-14-cultural-ceremony"
  | "mp-01-editorial"
  | "mp-02-luxe-reveal"
  | "mp-03-cinematic"
  | "mp-04-sealed-reveal"
  | "mp-06-botanical"
  | "mp-07-memory"
  | "mp-08-celebration"
  | "mp-10-live-event"
  | "mp-11-product"
  | "mp-12-quiet"
  | "mp-13-digital-light"
  | "mp-15-guided-story";

export type VisualThemeId =
  | "inherit"
  | "atelier-ivory"
  | "botanical-romance"
  | "midnight-metallic"
  | "coastal-air"
  | "filipino-craft"
  | "celebration-pop"
  | "memory-film"
  | "storybook-play"
  | "neon-nightlife"
  | "cinematic-frame"
  | "quiet-ceremony"
  | "corporate-precision"
  | "digital-light"
  | "festival-pulse"
  | "romantic-seal"
  | "guided-story"
  | "capiz-luminous"
  | "memorial-quiet";

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
