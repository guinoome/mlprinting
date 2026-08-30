import type { MotionStyle } from "../layouts/types";
import type { MotionLevel, MotionProfileId, PerformanceClass } from "./types";

export interface MotionProfile {
  id: MotionProfileId;
  normal: MotionStyle;
  reduced: "fade";
  level: Exclude<MotionLevel, "M0">;
  performanceClass: PerformanceClass;
}

/** Initial shared library from the handoff. Values reuse proven choreography. */
export const MOTION_PROFILES: Record<MotionProfileId, MotionProfile> = {
  elegant: {
    id: "elegant",
    normal: "rise",
    reduced: "fade",
    level: "M2",
    performanceClass: "light",
  },
  cinematic: {
    id: "cinematic",
    normal: "sweep",
    reduced: "fade",
    level: "M4",
    performanceClass: "cinematic",
  },
  luxury: {
    id: "luxury",
    normal: "rise",
    reduced: "fade",
    level: "M3",
    performanceClass: "standard",
  },
  playful: {
    id: "playful",
    normal: "pop",
    reduced: "fade",
    level: "M3",
    performanceClass: "standard",
  },
  neon: {
    id: "neon",
    normal: "pop",
    reduced: "fade",
    level: "M4",
    performanceClass: "cinematic",
  },
  tropical: {
    id: "tropical",
    normal: "sweep",
    reduced: "fade",
    level: "M3",
    performanceClass: "standard",
  },
  storybook: {
    id: "storybook",
    normal: "sweep",
    reduced: "fade",
    level: "M3",
    performanceClass: "standard",
  },
};
