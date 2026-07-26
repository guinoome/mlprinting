import { describe, expect, it } from "vitest";
import { countdownLabel, daysUntil } from "./overview";

describe("daysUntil", () => {
  const now = new Date("2026-02-10T15:30:00");

  it("counts whole days ahead", () => {
    expect(daysUntil(new Date("2026-02-14T09:00:00"), now)).toBe(4);
  });

  it("returns 0 for later the same day", () => {
    // The event is hours away but it is still today, not "in 0.4 days".
    expect(daysUntil(new Date("2026-02-10T23:00:00"), now)).toBe(0);
  });

  it("returns 1 for tomorrow morning, even from late tonight", () => {
    // Compared by day boundary, not by elapsed hours: 9 hours apart, but a
    // different day, so a guest would say "tomorrow".
    expect(daysUntil(new Date("2026-02-11T00:30:00"), new Date("2026-02-10T23:30:00"))).toBe(1);
  });

  it("is unaffected by the time of day it is asked", () => {
    const target = new Date("2026-03-01T18:00:00");
    const morning = daysUntil(target, new Date("2026-02-10T06:00:00"));
    const evening = daysUntil(target, new Date("2026-02-10T22:00:00"));
    expect(morning).toBe(evening);
  });

  it("crosses a month boundary correctly", () => {
    expect(daysUntil(new Date("2026-03-02T00:00:00"), new Date("2026-02-28T12:00:00"))).toBe(2);
  });
});

describe("countdownLabel", () => {
  it("says what a person would say", () => {
    expect(countdownLabel(0)).toBe("Today");
    expect(countdownLabel(1)).toBe("Tomorrow");
    expect(countdownLabel(12)).toBe("in 12 days");
  });

  it("never shows a negative count", () => {
    expect(countdownLabel(-3)).toBe("Today");
  });
});
