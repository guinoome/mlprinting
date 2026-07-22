"use client";

import * as React from "react";

/**
 * The envelope intro — Ph5. A shared invitation should feel like receiving one,
 * so the guest lands on a sealed envelope bearing the couple's monogram; it
 * opens (flap lifts, the card rises) and the invitation unfurls beneath.
 *
 * This component owns only the interaction. The invitation itself is `children`,
 * server-rendered and always present in the DOM — the envelope is an overlay on
 * top, never a gate the content lives behind. Three ways in, so no one is ever
 * stuck: tap the envelope, the Open button, or the auto-open after a few
 * seconds. `prefers-reduced-motion` skips the animation entirely, and a
 * `<noscript>` reveals everything when scripts do not run.
 *
 * It also drives the scroll-reveal: sections tagged `data-reveal` fade in as
 * they enter the viewport, once the invitation is shown.
 */
export function InvitationShell({
  monogram,
  coupleLine,
  style,
  children,
}: {
  monogram: string;
  /** Shown on the envelope's card — the names, or the event title. */
  coupleLine: string;
  /** The --inv-* theme variables, set on the root so the overlay is themed too. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const open = React.useCallback(() => {
    setOpening(true);
    // Match the flap + fade animation (~1.5s) before unmounting the overlay.
    window.setTimeout(() => setOpened(true), 1500);
  }, []);

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
