/**
 * Countdown time — Ph5.md §4. Two pure pieces: converting the event's
 * wall-clock date+time+zone into a real UTC instant, and counting down to it.
 */

/**
 * The UTC instant a wall-clock date+time means in a given IANA zone, using
 * only `Intl` (no date library): format a guess, measure how far Intl's
 * rendering of it drifted from the wall-clock we asked for, and correct by
 * that drift. The same problem `preview-model.ts`'s formatDate/formatTime
 * solve for *display*, in reverse — computing an instant rather than
 * formatting one.
 */
export function zonedInstant(
  calendarDate: Date,
  wallClockTime: string | null,
  timeZone: string,
): Date {
  const [hoursRaw, minutesRaw] = (wallClockTime ?? "00:00")
    .split(":")
    .map(Number);
  const hours = hoursRaw || 0;
  const minutes = minutesRaw || 0;

  const year = calendarDate.getUTCFullYear();
  const month = calendarDate.getUTCMonth();
  const day = calendarDate.getUTCDate();
  const guessUtc = Date.UTC(year, month, day, hours, minutes);

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    /** How far this zone's rendering of `instant` sits from the instant itself. */
    const offsetAt = (instant: number): number => {
      const map = Object.fromEntries(
        formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
      );
      const renderedAsUtc = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second),
      );
      return renderedAsUtc - instant;
    };

    // Correct twice, not once. The offset must be measured at the CORRECTED
    // instant: on a DST transition date the first guess and the answer sit on
    // opposite sides of the change, so a single pass lands an hour out — a
    // countdown that hits zero an hour late, on the day of the event.
    //
    // Two passes is enough for every real zone. Offsets change by at most an
    // hour or two, which never carries the second guess across a further
    // transition, and the third pass would be a no-op.
    const corrected = guessUtc - offsetAt(guessUtc);
    return new Date(guessUtc - offsetAt(corrected));
  } catch {
    // A bad zone must not crash the countdown — same graceful-fallback
    // posture as preview-model.ts's formatDate.
    return new Date(guessUtc);
  }
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/** Pure — the component supplies real `Date.now()`; tests supply a fixed one. */
export function timeRemaining(
  target: Date,
  now: Date = new Date(),
): TimeRemaining {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isPast: false,
  };
}
