"use client";

import * as React from "react";
import { timeRemaining } from "../countdown-time";

/**
 * Live countdown — Ph5.md §4. Computed client-side against the visitor's own
 * clock; a server-rendered countdown is stale the instant it's rendered.
 * Takes the already-resolved target instant (Task 7's zonedInstant) as a
 * prop, computed once by the page — see the design doc's Decision 5 carve-out
 * on why this bypasses PreviewModel rather than widening its contract.
 */
export function Countdown({ targetDate }: { targetDate: Date }) {
  const [remaining, setRemaining] = React.useState(() =>
    timeRemaining(targetDate),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(timeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (remaining.isPast) return null;

  const units: [string, number][] = [
    ["Days", remaining.days],
    ["Hours", remaining.hours],
    ["Minutes", remaining.minutes],
    ["Seconds", remaining.seconds],
  ];

  return (
    <div
      role="timer"
      aria-live="off"
      className="flex justify-center gap-4 text-center sm:gap-6"
    >
      {units.map(([label, value]) => (
        <div key={label}>
          <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
