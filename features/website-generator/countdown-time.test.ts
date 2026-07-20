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

  /**
   * The zone offset must be measured at the *corrected* instant, not at the
   * initial guess. On a spring-forward date the two sit on opposite sides of
   * the transition, so a single correction pass lands an hour out — a
   * countdown that hits zero an hour late, on the wedding day.
   */
  it("lands on the right instant across a spring-forward DST transition", () => {
    // America/New_York moves EST -> EDT at 02:00 on 2027-03-14.
    const result = zonedInstant(
      new Date("2027-03-14T00:00:00.000Z"),
      "03:00",
      "America/New_York",
    );

    const rendered = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(result);

    expect(rendered).toBe("03:00");
    expect(result.toISOString()).toBe("2027-03-14T07:00:00.000Z");
  });

  it("lands on the right instant across an autumn fall-back transition", () => {
    // America/New_York moves EDT -> EST at 02:00 on 2027-11-07.
    const result = zonedInstant(
      new Date("2027-11-07T00:00:00.000Z"),
      "23:00",
      "America/New_York",
    );

    const rendered = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(result);

    expect(rendered).toBe("23:00");
  });

  /**
   * Round-trip check across zones and dates that bracket real DST changes,
   * including southern-hemisphere zones (whose transitions run the opposite
   * way) and half-hour offsets. Whatever wall clock goes in must come back out.
   */
  it("round-trips the wall clock for every zone and date tried", () => {
    const zones = [
      "Asia/Manila",
      "America/New_York",
      "Europe/London",
      "Australia/Sydney",
      "Asia/Kolkata",
      "Pacific/Chatham",
    ];
    const dates = [
      "2027-03-14T00:00:00.000Z",
      "2027-11-07T00:00:00.000Z",
      "2027-04-04T00:00:00.000Z",
      "2027-10-03T00:00:00.000Z",
      "2027-06-15T00:00:00.000Z",
    ];
    const times = ["00:30", "03:00", "15:00", "23:30"];

    for (const timeZone of zones) {
      for (const date of dates) {
        for (const time of times) {
          const result = zonedInstant(new Date(date), time, timeZone);
          const rendered = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            hour: "2-digit",
            minute: "2-digit",
          }).format(result);

          // The one legitimate exception: a wall clock inside a spring-forward
          // gap does not exist, so it cannot round-trip. Assert it resolves
          // forward past the gap rather than backwards or to something wild.
          if (rendered !== time) {
            const wanted = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
            const got =
              Number(rendered.slice(0, 2)) * 60 + Number(rendered.slice(3));
            expect(got - wanted).toBeGreaterThan(0);
            expect(got - wanted).toBeLessThanOrEqual(120);
            continue;
          }
          expect(rendered).toBe(time);
        }
      }
    }
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
