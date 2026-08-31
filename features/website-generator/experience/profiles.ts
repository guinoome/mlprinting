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
  "mp-09-neon-pulse": {
    id: "mp-09-neon-pulse",
    normal: "pop",
    reduced: "fade",
    level: "M4",
    performanceClass: "cinematic",
  },
  "mp-12-quiet-tribute": {
    id: "mp-12-quiet-tribute",
    normal: "fade",
    reduced: "fade",
    level: "M2",
    performanceClass: "light",
  },
  "mp-14-cultural-ceremony": {
    id: "mp-14-cultural-ceremony",
    normal: "sweep",
    reduced: "fade",
    level: "M3",
    performanceClass: "standard",
  },
  "mp-01-editorial": {
    id: "mp-01-editorial", normal: "rise", reduced: "fade", level: "M2", performanceClass: "light",
  },
  "mp-02-luxe-reveal": {
    id: "mp-02-luxe-reveal", normal: "rise", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-03-cinematic": {
    id: "mp-03-cinematic", normal: "sweep", reduced: "fade", level: "M4", performanceClass: "cinematic",
  },
  "mp-04-sealed-reveal": {
    id: "mp-04-sealed-reveal", normal: "rise", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-06-botanical": {
    id: "mp-06-botanical", normal: "sweep", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-07-memory": {
    id: "mp-07-memory", normal: "sweep", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-08-celebration": {
    id: "mp-08-celebration", normal: "pop", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-10-live-event": {
    id: "mp-10-live-event", normal: "pop", reduced: "fade", level: "M4", performanceClass: "cinematic",
  },
  "mp-11-product": {
    id: "mp-11-product", normal: "sweep", reduced: "fade", level: "M3", performanceClass: "standard",
  },
  "mp-12-quiet": {
    id: "mp-12-quiet", normal: "fade", reduced: "fade", level: "M2", performanceClass: "light",
  },
  "mp-13-digital-light": {
    id: "mp-13-digital-light", normal: "sweep", reduced: "fade", level: "M4", performanceClass: "cinematic",
  },
  "mp-15-guided-story": {
    id: "mp-15-guided-story", normal: "rise", reduced: "fade", level: "M3", performanceClass: "standard",
  },
};
