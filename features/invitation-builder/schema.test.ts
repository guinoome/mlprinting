import { describe, expect, it } from "vitest";
import {
  eventStepSchema,
  hostSchema,
  venueSchema,
  contentStepSchema,
  personalizeStepSchema,
  draftTitleSchema,
  timeSchema,
} from "./schema";

/** First error message, for asserting the customer-facing copy. */
function firstError(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.success ? null : result.error!.issues[0]!.message;
}

describe("timeSchema — Ph3 §9 (Time Format)", () => {
  it("accepts 24-hour times", () => {
    for (const time of ["00:00", "09:05", "15:30", "23:59"]) {
      expect(timeSchema.safeParse(time).success).toBe(true);
    }
  });

  it("rejects out-of-range times", () => {
    for (const time of ["24:00", "25:30", "12:60", "-1:00"]) {
      expect(timeSchema.safeParse(time).success).toBe(false);
    }
  });

  it("rejects 12-hour and loose formats", () => {
    for (const time of ["3pm", "3:30 PM", "1530", "15.30"]) {
      expect(timeSchema.safeParse(time).success).toBe(false);
    }
  });

  it("treats blank as absent, not invalid — autosave saves half-typed drafts", () => {
    expect(timeSchema.safeParse("").data).toBeUndefined();
  });

  it("explains the format rather than saying 'invalid'", () => {
    expect(firstError(timeSchema.safeParse("3pm"))).toContain("15:30");
  });
});

describe("eventStepSchema — Ph3 §2", () => {
  it("accepts a fully empty step, because autosave must save nothing", () => {
    expect(eventStepSchema.safeParse({}).success).toBe(true);
  });

  it("parses a date at UTC midnight, not the server's midnight", () => {
    // new Date(2027, 2, 14) would be the server's zone — and the server is not
    // in Cebu. That shift shows up as the wrong date on a printed card.
    const result = eventStepSchema.parse({ eventDate: "2027-03-14" });
    expect(result.eventDate!.toISOString()).toBe("2027-03-14T00:00:00.000Z");
  });

  it("rejects an RSVP deadline after the event — Ph3 §9 Date Consistency", () => {
    const result = eventStepSchema.safeParse({
      eventDate: "2027-03-14",
      rsvpDeadline: "2027-04-01",
    });

    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("on or before the event date");
  });

  it("reports the date conflict against the RSVP field, which is the one to change", () => {
    const result = eventStepSchema.safeParse({
      eventDate: "2027-03-14",
      rsvpDeadline: "2027-04-01",
    });
    if (!result.success)
      expect(result.error.issues[0]!.path).toEqual(["rsvpDeadline"]);
  });

  it("allows an RSVP deadline on the event date", () => {
    expect(
      eventStepSchema.safeParse({
        eventDate: "2027-03-14",
        rsvpDeadline: "2027-03-14",
      }).success,
    ).toBe(true);
  });

  it("allows an RSVP deadline with no event date yet", () => {
    // Mid-draft, the customer may have typed one and not the other.
    expect(
      eventStepSchema.safeParse({ rsvpDeadline: "2027-03-14" }).success,
    ).toBe(true);
  });

  it("accepts a real IANA zone and rejects a made-up one", () => {
    expect(eventStepSchema.safeParse({ timeZone: "Asia/Manila" }).success).toBe(
      true,
    );
    expect(
      eventStepSchema.safeParse({ timeZone: "Middle/Earth" }).success,
    ).toBe(false);
  });

  it("defaults to Manila", () => {
    expect(eventStepSchema.parse({}).timeZone).toBe("Asia/Manila");
  });

  it("enforces character limits with a message naming the field", () => {
    const result = eventStepSchema.safeParse({ eventTitle: "a".repeat(200) });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("Event title");
  });

  it("trims, and treats whitespace-only as absent", () => {
    expect(
      eventStepSchema.parse({ eventTitle: "  Wedding  " }).eventTitle,
    ).toBe("Wedding");
    expect(
      eventStepSchema.parse({ eventTitle: "   " }).eventTitle,
    ).toBeUndefined();
  });
});

describe("hostSchema — Ph3 §3", () => {
  it("accepts a host", () => {
    expect(
      hostSchema.safeParse({ role: "bride", displayName: "Maria Santos" })
        .success,
    ).toBe(true);
  });

  it("requires a name, and says so plainly", () => {
    const result = hostSchema.safeParse({ role: "bride", displayName: "" });
    expect(firstError(result)).toBe("Add a name.");
  });

  it("rejects a role that is not a slug", () => {
    expect(
      hostSchema.safeParse({ role: "Bride & Groom", displayName: "X" }).success,
    ).toBe(false);
  });

  it("treats a blank photo as no photo", () => {
    const result = hostSchema.parse({
      role: "bride",
      displayName: "X",
      photoAssetId: "",
    });
    expect(result.photoAssetId).toBeUndefined();
  });

  it("rejects a photo id that is not a uuid", () => {
    expect(
      hostSchema.safeParse({
        role: "bride",
        displayName: "X",
        photoAssetId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});

describe("venueSchema — Ph3 §4", () => {
  const base = { kind: "CEREMONY" as const, name: "Santo Niño Basilica" };

  it("accepts a venue", () => {
    expect(venueSchema.safeParse(base).success).toBe(true);
  });

  it("requires a name", () => {
    expect(firstError(venueSchema.safeParse({ ...base, name: "" }))).toBe(
      "Add the venue name.",
    );
  });

  it("rejects a maps link that is not a URL, and says where to get one", () => {
    const result = venueSchema.safeParse({
      ...base,
      mapsUrl: "maps.google/foo",
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("Google Maps");
  });

  it("accepts a real maps URL", () => {
    expect(
      venueSchema.safeParse({
        ...base,
        mapsUrl: "https://maps.app.goo.gl/abc123",
      }).success,
    ).toBe(true);
  });

  it("treats a blank maps link as absent", () => {
    expect(venueSchema.parse({ ...base, mapsUrl: "" }).mapsUrl).toBeUndefined();
  });

  it("carries a per-venue time, because a ceremony and reception differ", () => {
    expect(venueSchema.parse({ ...base, startTime: "15:00" }).startTime).toBe(
      "15:00",
    );
  });
});

describe("contentStepSchema — Ph3 §5", () => {
  it("accepts empty content", () => {
    expect(
      contentStepSchema.safeParse({ people: [], program: [] }).success,
    ).toBe(true);
  });

  it("limits messages to what fits on a card, not what fits in Postgres", () => {
    const result = contentStepSchema.safeParse({
      welcomeMessage: "a".repeat(501),
      people: [],
      program: [],
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("Welcome message");
  });

  it("accepts parents and sponsors in one list, distinguished by group", () => {
    const result = contentStepSchema.safeParse({
      people: [
        { group: "PARENT", name: "Rosa Santos", role: "Mother of the Bride" },
        { group: "SPONSOR", name: "Dr. Luis Cruz" },
      ],
      program: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a programme with times", () => {
    const result = contentStepSchema.safeParse({
      people: [],
      program: [{ time: "15:00", title: "Ceremony" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a programme item with a bad time", () => {
    const result = contentStepSchema.safeParse({
      people: [],
      program: [{ time: "3pm", title: "Ceremony" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("personalizeStepSchema — Ph3 §6", () => {
  const valid = {
    colorTheme: "blush-rose",
    typography: "modern-sans",
    backgroundStyle: "plain",
    decorativeStyle: "none",
    hiddenSections: [],
  };

  it("accepts approved slugs", () => {
    expect(personalizeStepSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a raw colour — this is what keeps §6 enforceable", () => {
    const result = personalizeStepSchema.safeParse({
      ...valid,
      colorTheme: "#ff0000",
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("not available");
  });

  it("rejects an unapproved font", () => {
    expect(
      personalizeStepSchema.safeParse({ ...valid, typography: "comic-sans" })
        .success,
    ).toBe(false);
  });

  it("keeps known hidden sections", () => {
    const result = personalizeStepSchema.parse({
      ...valid,
      hiddenSections: ["gifts", "rsvp"],
    });
    expect(result.hiddenSections).toEqual(["gifts", "rsvp"]);
  });

  it("drops unknown hidden sections instead of failing the save", () => {
    // A section retired from the design system must not make an old draft
    // unsaveable.
    const result = personalizeStepSchema.parse({
      ...valid,
      hiddenSections: ["gifts", "retired-section"],
    });
    expect(result.hiddenSections).toEqual(["gifts"]);
  });
});

describe("draftTitleSchema — Ph3 §11", () => {
  it("requires a name", () => {
    expect(firstError(draftTitleSchema.safeParse({ title: "  " }))).toBe(
      "Give this draft a name.",
    );
  });

  it("trims", () => {
    expect(draftTitleSchema.parse({ title: "  Maria & Jose  " }).title).toBe(
      "Maria & Jose",
    );
  });
});
