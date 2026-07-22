"use client";

import * as React from "react";

/** Confetti particle shapes, chosen per event kind by the caller. */
export type ConfettiShape = "petal" | "circle" | "star" | "rect";

export interface ConfettiConfig {
  colors: string[];
  shape: ConfettiShape;
}

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
 * The envelope intro — Ph5. A shared invitation should feel like receiving one,
 * so the guest lands on a sealed envelope bearing the monogram; it opens (flap
 * lifts, the card rises), confetti bursts, and the invitation unfurls beneath.
 *
 * This component owns only the interaction. The invitation itself is `children`,
 * server-rendered and always present in the DOM — the envelope is an overlay on
 * top, never a gate the content lives behind. Three ways in, so no one is ever
 * stuck: tap the envelope, the Open button, or the auto-open after a few
 * seconds. `prefers-reduced-motion` skips the animation and confetti entirely,
 * and a `<noscript>` reveals everything when scripts do not run.
 *
 * It also drives the scroll-reveal: sections tagged `data-reveal` fade in as
 * they enter the viewport, once the invitation is shown.
 */
export function InvitationShell({
  monogram,
  coupleLine,
  confetti,
  style,
  children,
}: {
  monogram: string;
  /** Shown on the envelope's card — the names, or the event title. */
  coupleLine: string;
  /** Confetti fired on open; omit to fire none. */
  confetti?: ConfettiConfig;
  /** The --inv-* theme variables, set on the root so the overlay is themed too. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const cancelConfetti = React.useRef<() => void>(() => {});

  const open = React.useCallback(() => {
    setOpening(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (confetti && canvasRef.current && !reduce) {
      // Let the flap start lifting first, then burst.
      window.setTimeout(() => {
        if (canvasRef.current) {
          cancelConfetti.current = fireConfetti(canvasRef.current, confetti);
        }
      }, 550);
    }
    window.setTimeout(() => setOpened(true), 1500);
  }, [confetti]);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOpened(true);
      return;
    }
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(open, 4500);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      cancelConfetti.current();
    };
  }, [open]);

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

  return (
    <div ref={rootRef} className="inv-reveal-root" style={style}>
      <noscript>
        <style>{`.inv-overlay{display:none!important}.inv-reveal-root [data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <canvas ref={canvasRef} className="inv-confetti" aria-hidden="true" />

      {!opened ? (
        <div className={opening ? "inv-overlay is-opening" : "inv-overlay"}>
          <button
            type="button"
            onClick={open}
            className={opening ? "inv-env is-opening" : "inv-env"}
            aria-label="Open invitation"
          >
            <span className="inv-env-body">
              <span className="inv-env-card">
                <span className="inv-env-k">You are invited</span>
                <span className="inv-env-n">{coupleLine}</span>
              </span>
              <span className="inv-pocket" />
            </span>
            <span className="inv-flap" />
            <span className="inv-seal">{monogram}</span>
          </button>
          <p className="inv-hint">Tap to open</p>
          <button type="button" onClick={open} className="inv-open-btn">
            Open invitation
          </button>
        </div>
      ) : null}

      {children}
    </div>
  );
}
