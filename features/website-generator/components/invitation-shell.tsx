"use client";

import * as React from "react";
import type { MotionStyle } from "../layouts/types";
import type {
  MotionLevel,
  MotionProfileId,
  VisualThemeId,
} from "../experience/types";

/** Confetti particle shapes, chosen per event kind by the caller. */
export type ConfettiShape = "petal" | "circle" | "star" | "rect";

export interface ConfettiConfig {
  colors: string[];
  shape: ConfettiShape;
}

const ENTRY_COPY: Partial<
  Record<VisualThemeId, { kicker: string; action: string }>
> = {
  "capiz-luminous": {
    kicker: "A Filipino celebration of light and love",
    action: "Open the light",
  },
  "neon-nightlife": {
    kicker: "One night. Eighteen years in the making.",
    action: "Enter the night",
  },
  "festival-pulse": {
    kicker: "Cebu moves to the rhythm of fiesta",
    action: "Join the fiesta",
  },
  "digital-light": {
    kicker: "The next chapter starts on stage",
    action: "Reveal the launch",
  },
  "memorial-quiet": {
    kicker: "A life remembered",
    action: "View the tribute",
  },
  "atelier-ivory": {
    kicker: "A couture ceremony, written in light",
    action: "Lift the veil",
  },
  "botanical-romance": {
    kicker: "Where our forever takes root",
    action: "Enter the garden",
  },
  "midnight-metallic": {
    kicker: "Black tie. Candlelight. Our next chapter.",
    action: "Part the night",
  },
};

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ConfettiShape,
  size: number,
) {
  switch (shape) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rect":
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      break;
    case "petal":
      ctx.beginPath();
      ctx.ellipse(0, 0, size / 2, size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outer = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const inner = outer + Math.PI / 5;
        ctx.lineTo(Math.cos(outer) * (size / 2), Math.sin(outer) * (size / 2));
        ctx.lineTo(Math.cos(inner) * (size / 5), Math.sin(inner) * (size / 5));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

/** Fire a one-shot confetti burst from the upper-middle of the screen. Returns a cancel fn. */
function fireConfetti(
  canvas: HTMLCanvasElement,
  { colors, shape }: ConfettiConfig,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 96 }, () => ({
    x: W * (0.5 + (Math.random() - 0.5) * 0.24),
    y: H * 0.3 + Math.random() * 20,
    vx: (Math.random() - 0.5) * 8,
    vy: -6 - Math.random() * 8,
    g: 0.17 + Math.random() * 0.13,
    size: 6 + Math.random() * 8,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.32,
    color: colors[Math.floor(Math.random() * colors.length)] ?? "#ffffff",
    life: 0,
    ttl: 90 + Math.random() * 55,
  }));

  let raf = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      if (p.life > p.ttl) continue;
      alive = true;
      p.life += 1;
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      drawShape(ctx, shape, p.size);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, W, H);
  };
  draw();
  return () => cancelAnimationFrame(raf);
}

/**
 * The interactive opening — every experience gets an intentional threshold,
 * not a universal envelope. The first launch experiences use a capiz light gate,
 * a nightlife title sequence, and a quiet memorial arrival; the remaining
 * portfolio can add vocabulary through the same controlled theme seam.
 *
 * This component owns only the interaction. The invitation itself is `children`,
 * server-rendered and always present in the DOM — the envelope is an overlay on
 * top, never a gate the content lives behind. The action is an ordinary focused
 * button, with no timer racing a desktop click. `prefers-reduced-motion` skips
 * the animation and confetti entirely,
 * and a `<noscript>` reveals everything when scripts do not run.
 *
 * It also drives the scroll-reveal: sections tagged `data-reveal` fade in as
 * they enter the viewport, once the invitation is shown.
 */
export function InvitationShell({
  coupleLine,
  confetti,
  style,
  motion = "rise",
  experienceEnabled = false,
  experienceId,
  motionProfile,
  motionLevel = "M0",
  visualThemeId = "inherit",
  children,
}: {
  monogram: string;
  /** Shown on the envelope's card — the names, or the event title. */
  coupleLine: string;
  /** Confetti fired on open; omit to fire none. */
  confetti?: ConfettiConfig;
  /** The --inv-* theme variables, set on the root so the overlay is themed too. */
  style?: React.CSSProperties;
  /**
   * The occasion's reveal choreography, published to CSS as `data-motion` on
   * the reveal root. One attribute on the root rather than a class per section:
   * the observer below tags elements with `.vis` and knows nothing about which
   * occasion it is animating, and it should stay that way.
   */
  motion?: MotionStyle;
  /** Enables the profile hooks while leaving the legacy renderer reversible. */
  experienceEnabled?: boolean;
  experienceId?: string;
  motionProfile?: MotionProfileId;
  motionLevel?: MotionLevel;
  visualThemeId?: VisualThemeId;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const cancelConfetti = React.useRef<() => void>(() => {});
  const openingRef = React.useRef(false);
  const entryCopy = ENTRY_COPY[visualThemeId] ?? {
    kicker: "You are invited",
    action: "Open invitation",
  };

  const open = React.useCallback(() => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    // Fire synchronously, inside the gesture, so audio autoplay is permitted.
    window.dispatchEvent(new CustomEvent("invitation:open"));
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (confetti && canvasRef.current && !reduce) {
      // Let the flap start lifting first, then burst.
      window.setTimeout(() => {
        if (canvasRef.current) {
          cancelConfetti.current = fireConfetti(canvasRef.current, confetti);
        }
      }, 550);
    }
    window.setTimeout(() => setOpened(true), reduce ? 0 : 900);
  }, [confetti]);

  React.useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setOpened(true);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      cancelConfetti.current();
    };
  }, []);

  React.useEffect(() => {
    if (opened) document.body.style.overflow = "";
  }, [opened]);

  React.useEffect(() => {
    if (!opened || !rootRef.current) return;
    const targets = rootRef.current.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened]);

  // Hero parallax: the cover drifts slower than the scroll. The photo is
  // oversized (CSS) so the drift never exposes an edge.
  React.useEffect(() => {
    if (!opened || !rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const photo = rootRef.current.querySelector<HTMLElement>(".inv-hero-photo");
    if (!photo) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        photo.style.transform = `translateY(${window.scrollY * 0.2}px)`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [opened]);

  return (
    <div
      ref={rootRef}
      className="inv-reveal-root"
      data-motion={motion}
      data-experience-enabled={experienceEnabled ? "true" : "false"}
      data-experience-id={experienceId}
      data-motion-profile={experienceEnabled ? motionProfile : undefined}
      data-motion-level={experienceEnabled ? motionLevel : "M0"}
      data-visual-theme={experienceEnabled ? visualThemeId : "inherit"}
      data-opened={opened ? "true" : "false"}
      style={style}
    >
      <noscript>
        <style>{`.inv-overlay{display:none!important}.inv-reveal-root [data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      {/* Omitted entirely when there is nothing to fire — a memorial notice
          should not carry a confetti surface at all, even an empty one. */}
      {confetti ? (
        <canvas ref={canvasRef} className="inv-confetti" aria-hidden="true" />
      ) : null}

      {!opened ? (
        <div
          className={`inv-overlay inv-entry inv-entry--${visualThemeId}${opening ? "is-opening" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Invitation from ${coupleLine}`}
        >
          <div className="inv-entry-shade" aria-hidden="true" />
          <div className="inv-entry-brand" aria-hidden="true">
            <span>ML</span>
            <small>Printing</small>
          </div>
          <div className="inv-entry-copy">
            <p className="inv-entry-kicker">{entryCopy.kicker}</p>
            <p className="inv-entry-title">{coupleLine}</p>
            <button
              type="button"
              onClick={open}
              className="inv-entry-action"
              disabled={opening}
            >
              {opening ? "Opening…" : entryCopy.action}
            </button>
          </div>
          <p className="inv-entry-access">Press the button to continue</p>
        </div>
      ) : null}

      {children}
    </div>
  );
}
