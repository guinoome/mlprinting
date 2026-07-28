"use client";

import * as React from "react";

/**
 * The hero's moving background — increment 5 of
 * docs/invitation-design-language.md.
 *
 * Renders in place of the full-bleed photograph when a video has been uploaded.
 * Only the two over-photo heroes use it (see isOverPhoto in hero.tsx): a video
 * inside an arch or a circle is a different feature, and a video behind a
 * memorial's portrait is one nobody asked for.
 *
 * The important decision here is that **the video does not carry the `autoplay`
 * attribute**. It is played from an effect instead, and only when playing is
 * appropriate. That ordering is deliberate:
 *
 *  - A guest who has asked for reduced motion gets a still frame. WCAG 2.2.2
 *    is about motion that starts on its own, and `autoplay` in the markup
 *    starts before any script can decide otherwise.
 *  - A guest on a metered connection gets a still frame, because Save-Data is
 *    a request not to spend their money on decoration.
 *  - With JavaScript off, nothing plays and the poster shows — which is the
 *    same invitation that shipped before this component existed.
 *
 * The poster is the cover image, so the hero looks finished while the video
 * loads, if it fails, and in every case above. There is no state in which this
 * component renders emptiness.
 */

export interface HeroVideoPolicy {
  /** Whether to start playback without being asked. */
  autoplay: boolean;
  /** Why not, when not. Surfaced only to make the rule testable. */
  reason: "ok" | "reduced-motion" | "save-data";
}

/**
 * Whether a hero video should play on its own. Pure, so the rule is assertable
 * without a browser, a network or a video file.
 */
export function heroVideoPolicy(env: {
  reducedMotion: boolean;
  saveData: boolean;
}): HeroVideoPolicy {
  // Reduced motion first: it is an accessibility request, where Save-Data is a
  // cost one. If a guest has asked for both, the reason they are told about
  // should be the one that would still apply on unmetered wifi.
  if (env.reducedMotion) return { autoplay: false, reason: "reduced-motion" };
  if (env.saveData) return { autoplay: false, reason: "save-data" };
  return { autoplay: true, reason: "ok" };
}

/** Reads the two signals from the browser. Split out so the policy stays pure. */
function readEnvironment(): { reducedMotion: boolean; saveData: boolean } {
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // navigator.connection is not in every browser and is not in lib.dom.
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;

  return { reducedMotion, saveData: connection?.saveData === true };
}

export function HeroVideo({
  src,
  poster,
  className,
}: {
  src: string;
  /** The cover image. Shown until the video paints, and whenever it must not play. */
  poster?: string | null;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const { autoplay } = heroVideoPolicy(readEnvironment());
    if (!autoplay) return;

    // play() rejects when a browser declines — a policy we have not met, or a
    // codec it will not decode. The poster is already on screen, so there is
    // nothing to fall back to and nothing to report.
    void video.play().catch(() => {});
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster ?? undefined}
      // muted and playsInline are what make autoplay permissible at all on a
      // phone. Sound would also fight the invitation's own music player.
      muted
      loop
      playsInline
      // Metadata only: the poster covers the first paint, so there is no reason
      // to pull the whole file before we know whether it is allowed to play.
      preload="metadata"
      // Decoration. The invitation states everything this video shows in text.
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={src} />
    </video>
  );
}
