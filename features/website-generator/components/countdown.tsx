"use client";

import * as React from "react";
import { timeRemaining } from "../countdown-time";
import type { TimeRemaining } from "../countdown-time";

/**
 * Live countdown — Ph5.md §4. Computed client-side against the visitor's own
 * clock; a server-rendered countdown is stale the instant it's rendered.
 * Takes the already-resolved target instant (Task 7's zonedInstant) as a
 * prop, computed once by the page — see the design doc's Decision 5 carve-out
 * on why this bypasses PreviewModel rather than widening its contract.
 */
export function Countdown({ targetDate }: { targetDate: Date }) {
  // Keep the first server and client render identical. Reading the clock in a
  // state initializer lets them land on adjacent seconds and makes React
  // discard the entire invitation during hydration.
  const [remaining, setRemaining] = React.useState<TimeRemaining | null>(null);

  React.useEffect(() => {
    const update = () => setRemaining(timeRemaining(targetDate));
    update();
    const interval = setInterval(() => {
      update();
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (remaining?.isPast) return null;

  const units: [string, number | null][] = [
    ["Days", remaining?.days ?? null],
    ["Hrs", remaining?.hours ?? null],
    ["Min", remaining?.minutes ?? null],
    ["Sec", remaining?.seconds ?? null],
  ];

  return (
    <div
      role="timer"
      aria-label={remaining ? "Time remaining" : "Countdown loading"}
      aria-live="off"
      className="inv-count"
    >
      {units.map(([label, value]) => (
        <div key={label} className="inv-count-u">
          <div className="inv-count-v">
            {value === null ? "--" : String(value).padStart(2, "0")}
          </div>
          <div className="inv-count-l">{label}</div>
        </div>
      ))}
    </div>
  );
}
