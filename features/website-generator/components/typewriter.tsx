"use client";

import * as React from "react";

/**
 * Types a short line out, one character at a time, with a blinking caret — the
 * hero's opening beat. Reduced motion (or no JS) shows the full line at once;
 * the text is always in the DOM, so it is never hidden from a screen reader or
 * a crawler.
 */
export function Typewriter({
  text,
  className,
  speed = 55,
  startDelay = 300,
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
}) {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCount(0);
    let i = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) window.clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  // count === null → not animating (reduced motion / pre-hydration): show it all.
  const shown = count === null ? text : text.slice(0, count);
  const typing = count !== null && count < text.length;

  return (
    <span className={className}>
      {shown}
      {typing ? <span className="inv-caret" aria-hidden="true" /> : null}
    </span>
  );
}
