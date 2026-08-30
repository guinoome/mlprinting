import { describe, expect, it } from "vitest";
import { parseRsvpCriteria, rsvpCsv } from "./rsvp-intelligence";
describe("RSVP intelligence", () => {
  it("normalizes search and rejects unknown filters", () => {
    expect(parseRsvpCriteria({ q: "  Maria  ", status: "other" })).toEqual({
      query: "Maria",
      status: "all",
    });
  });
  it("accepts the governed status filters", () => {
    expect(parseRsvpCriteria({ status: "declined" }).status).toBe("declined");
    expect(parseRsvpCriteria({ status: "pending" }).status).toBe("pending");
  });
  it("exports quoted CSV and neutralizes spreadsheet formulas", () => {
    const csv = rsvpCsv([
      {
        guestName: '=HYPERLINK("bad")',
        attending: true,
        guestCount: 2,
        message: "Hello, family",
        createdAt: new Date("2026-08-30T01:00:00.000Z"),
      },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Hello, family"');
    expect(csv).toContain('"Attending","2"');
  });
});
