import { describe, expect, it } from "vitest";
import { splitDate } from "./date-row";

describe("splitDate", () => {
  it("splits a known date into its four pieces", () => {
    expect(splitDate(new Date("2026-08-22T00:00:00.000Z"))).toEqual({
      weekday: "Saturday",
      day: "22",
      month: "August",
      year: "2026",
    });
  });

  it("does not zero-pad the day", () => {
    // An invitation prints 5 August; 05 August reads as a receipt.
    expect(splitDate(new Date("2026-08-05T00:00:00.000Z")).day).toBe("5");
  });

  it("keeps the first of the month in that month", () => {
    // The case that breaks if the date is ever read in the viewer's zone: west
    // of UTC this instant is the 31st of July, and the invitation would name
    // the wrong month to half the guest list.
    const parts = splitDate(new Date("2026-08-01T00:00:00.000Z"));
    expect(parts.month).toBe("August");
    expect(parts.day).toBe("1");
  });

  it("is unmoved by the time of day on the input", () => {
    const midnight = splitDate(new Date("2026-08-22T00:00:00.000Z"));
    const noon = splitDate(new Date("2026-08-22T12:00:00.000Z"));
    const lastMinute = splitDate(new Date("2026-08-22T23:59:59.000Z"));

    expect(noon).toEqual(midnight);
    expect(lastMinute).toEqual(midnight);
  });

  it("falls back to English rather than throwing on a bad locale tag", () => {
    // "en_PH" is a POSIX locale name, not a BCP 47 tag, and Intl rejects it.
    expect(splitDate(new Date("2026-08-22T00:00:00.000Z"), "en_PH").month).toBe(
      "August",
    );
  });
});
