import { describe, expect, it } from "vitest";
import { zonedInstant, timeRemaining } from "./countdown-time";

describe("zonedInstant", () => {
  it("converts a wall-clock date+time in a zone to the correct UTC instant", () => {
    // 3pm in Manila (UTC+8, no DST) is 7am UTC the same day.
    const result = zonedInstant(
      new Date("2027-03-14T00:00:00.000Z"),
      "15:00",
      "Asia/Manila",
    );
    expect(result.toISOString()).toBe("2027-03-14T07:00:00.000Z");
  });

  it("defaults to midnight when no wall-clock time is set", () => {
    const result = zonedInstant(
      new Date("2027-03-14T00:00:00.000Z"),
      null,
      "Asia/Manila",
    );
    // Midnight in Manila is 4pm UTC the previous day.
    expect(result.toISOString()).toBe("2027-03-13T16:00:00.000Z");
  });

  it("falls back rather than throwing on a bad zone", () => {
    expect(() =>
      zonedInstant(new Date("2027-03-14T00:00:00.000Z"), "15:00", "Not/AZone"),
    ).not.toThrow();
  });
});

describe("timeRemaining", () => {
  it("breaks down days, hours, minutes, seconds for a future target", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    // 1 day, 1 hour, 1 minute, 1 second ahead.
    const target = new Date(now.getTime() + ((24 + 1) * 3600 + 61) * 1000);
    const result = timeRemaining(target, now);
    expect(result).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      isPast: false,
    });
  });

  it("reports isPast for a target already passed", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    const target = new Date("2026-12-31T00:00:00.000Z");
    expect(timeRemaining(target, now).isPast).toBe(true);
  });

  it("reports isPast at the exact instant, not one second before", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    expect(timeRemaining(new Date(now), now).isPast).toBe(true);
  });
});
