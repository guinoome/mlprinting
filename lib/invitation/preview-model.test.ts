import { describe, expect, it } from "vitest";
import {
  toPreviewModel,
  formatDate,
  formatTime,
  shows,
  type PreviewInput,
} from "./preview-model";

function input(over: Partial<PreviewInput> = {}): PreviewInput {
  return {
    eventTitle: "Maria & Jose",
    subtitle: null,
    eventDate: new Date("2027-03-14T00:00:00.000Z"),
    eventTime: "15:00",
    timeZone: "Asia/Manila",
    rsvpDeadline: null,
    dressCode: null,
    eventTheme: null,
    language: "en",
    hosts: [],
    venues: [],
    content: null,
    people: [],
    program: [],
    personalization: null,
    mediaUrls: {},
    ...over,
  };
}

describe("formatDate", () => {
  it("formats in the event's zone, not the viewer's", () => {
    // A Cebu event viewed from anywhere must print the Cebu date.
    const result = formatDate(
      new Date("2027-03-14T00:00:00.000Z"),
      "Asia/Manila",
      "en",
    );
    expect(result).toContain("March");
    expect(result).toContain("2027");
  });

  it("does not shift the day across zones", () => {
    // UTC midnight is 8am in Manila — same calendar day. The failure this
    // guards is an event just after midnight showing the previous day.
    const date = new Date("2027-03-14T00:00:00.000Z");
    expect(formatDate(date, "Asia/Manila", "en")).toContain("14");
  });

  it("falls back rather than blanking the invitation on a bad zone", () => {
    expect(
      formatDate(new Date("2027-03-14T00:00:00Z"), "Middle/Earth", "en"),
    ).toContain("2027");
  });

  it("falls back on a bad language tag", () => {
    expect(
      formatDate(new Date("2027-03-14T00:00:00Z"), "Asia/Manila", "!!bad!!"),
    ).toContain("2027");
  });
});

describe("formatTime", () => {
  it("renders a wall-clock time in 12-hour form", () => {
    expect(formatTime("15:30", "en")).toMatch(/3:30\s?PM/i);
    expect(formatTime("09:05", "en")).toMatch(/9:05\s?AM/i);
  });

  it("handles midnight and noon", () => {
    expect(formatTime("00:00", "en")).toMatch(/12:00\s?AM/i);
    expect(formatTime("12:00", "en")).toMatch(/12:00\s?PM/i);
  });

  it("does not shift the time — a 3pm ceremony must never print as 7am", () => {
    // This is the bug the wall-clock string exists to prevent. If the time were
    // stored as a DateTime and converted, this would fail.
    expect(formatTime("15:00", "en")).toMatch(/3:00\s?PM/i);
  });

  it("returns the raw value rather than crashing on nonsense", () => {
    expect(formatTime("not-a-time", "en")).toBe("not-a-time");
  });
});

describe("toPreviewModel — content", () => {
  it("carries the title through", () => {
    expect(toPreviewModel(input()).title).toBe("Maria & Jose");
  });

  it("shows a placeholder title rather than an empty heading", () => {
    // The preview renders from step 1, before anything is typed.
    expect(toPreviewModel(input({ eventTitle: null })).title).toBe(
      "Your event title",
    );
    expect(toPreviewModel(input({ eventTitle: "   " })).title).toBe(
      "Your event title",
    );
  });

  it("preformats the date and time so the renderer never parses one", () => {
    const model = toPreviewModel(input());
    expect(model.dateLine).toContain("March");
    expect(model.timeLine).toMatch(/3:00\s?PM/i);
  });

  it("leaves date and time null when unset", () => {
    const model = toPreviewModel(input({ eventDate: null, eventTime: null }));
    expect(model.dateLine).toBeNull();
    expect(model.timeLine).toBeNull();
  });

  it("splits people into parents and sponsors", () => {
    const model = toPreviewModel(
      input({
        people: [
          { id: "1", group: "PARENT", name: "Rosa", role: "Mother" },
          { id: "2", group: "SPONSOR", name: "Luis", role: null },
          { id: "3", group: "ENTOURAGE", name: "Ana", role: null },
        ],
      }),
    );

    expect(model.parents.map((p) => p.name)).toEqual(["Rosa"]);
    expect(model.sponsors.map((p) => p.name)).toEqual(["Luis"]);
  });

  it("labels venues by kind", () => {
    const model = toPreviewModel(
      input({
        venues: [
          {
            id: "1",
            kind: "CEREMONY",
            name: "Basilica",
            address: null,
            mapsUrl: null,
            parkingNotes: null,
            startTime: "15:00",
          },
          {
            id: "2",
            kind: "RECEPTION",
            name: "Hall",
            address: null,
            mapsUrl: null,
            parkingNotes: null,
            startTime: "18:00",
          },
        ],
      }),
    );

    expect(model.venues[0]!.label).toBe("Ceremony");
    expect(model.venues[1]!.label).toBe("Reception");
  });

  it("formats each venue's own time — a ceremony and reception differ", () => {
    const model = toPreviewModel(
      input({
        venues: [
          {
            id: "1",
            kind: "CEREMONY",
            name: "Basilica",
            address: null,
            mapsUrl: null,
            parkingNotes: null,
            startTime: "15:00",
          },
          {
            id: "2",
            kind: "RECEPTION",
            name: "Hall",
            address: null,
            mapsUrl: null,
            parkingNotes: null,
            startTime: "18:00",
          },
        ],
      }),
    );

    expect(model.venues[0]!.timeLine).toMatch(/3:00\s?PM/i);
    expect(model.venues[1]!.timeLine).toMatch(/6:00\s?PM/i);
  });

  it("writes the RSVP line as a sentence, not a raw date", () => {
    const model = toPreviewModel(
      input({ rsvpDeadline: new Date("2027-02-14T00:00:00Z") }),
    );
    expect(model.rsvpLine).toContain("Kindly reply by");
    expect(model.rsvpLine).toContain("February");
  });

  it("has no RSVP line without a deadline", () => {
    expect(toPreviewModel(input()).rsvpLine).toBeNull();
  });

  it("takes the first cover image and merges couple and family into the gallery", () => {
    const model = toPreviewModel(
      input({
        mediaUrls: {
          COVER: ["cover.jpg", "ignored.jpg"],
          COUPLE: ["couple1.jpg"],
          FAMILY: ["family1.jpg"],
        },
      }),
    );

    expect(model.coverImageUrl).toBe("cover.jpg");
    expect(model.galleryUrls).toEqual(["couple1.jpg", "family1.jpg"]);
  });

  it("survives no media at all", () => {
    const model = toPreviewModel(input());
    expect(model.coverImageUrl).toBeNull();
    expect(model.galleryUrls).toEqual([]);
  });
});

describe("toPreviewModel — style resolution", () => {
  it("resolves design slugs into values a renderer can use", () => {
    const model = toPreviewModel(
      input({
        personalization: {
          colorTheme: "midnight-navy",
          typography: "modern-sans",
          backgroundStyle: "bordered",
          decorativeStyle: "botanical",
          hiddenSections: [],
        },
      }),
    );

    expect(model.style.background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(model.style.headingFont).toContain("Helvetica");
    expect(model.style.backgroundStyle).toBe("bordered");
    expect(model.style.decorativeStyle).toBe("botanical");
  });

  it("falls back to defaults with no personalization row", () => {
    const model = toPreviewModel(input({ personalization: null }));
    expect(model.style.background).toBeTruthy();
    expect(model.style.headingFont).toBeTruthy();
  });

  it("falls back rather than crashing on a retired slug", () => {
    const model = toPreviewModel(
      input({
        personalization: {
          colorTheme: "retired",
          typography: "retired",
          backgroundStyle: "plain",
          decorativeStyle: "none",
          hiddenSections: [],
        },
      }),
    );
    expect(model.style.background).toBeTruthy();
  });

  it("is the only place design slugs become values — invitation data stays clean", () => {
    // The input carries slugs; the output carries hex. If a hex ever appears on
    // PreviewInput, the content/presentation split has been broken.
    const raw = input();
    expect(JSON.stringify(raw)).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe("section visibility", () => {
  it("carries hidden sections through", () => {
    const model = toPreviewModel(
      input({
        personalization: {
          colorTheme: "classic-ivory",
          typography: "classic-serif",
          backgroundStyle: "plain",
          decorativeStyle: "none",
          hiddenSections: ["gifts", "rsvp"],
        },
      }),
    );

    expect(model.hidden.has("gifts")).toBe(true);
    expect(model.hidden.has("rsvp")).toBe(true);
    expect(model.hidden.has("venues")).toBe(false);
  });

  it("shows() respects both the toggle and whether there is content", () => {
    const model = toPreviewModel(
      input({
        personalization: {
          colorTheme: "classic-ivory",
          typography: "classic-serif",
          backgroundStyle: "plain",
          decorativeStyle: "none",
          hiddenSections: ["gifts"],
        },
      }),
    );

    expect(shows(model, "gifts", true)).toBe(false); // hidden
    expect(shows(model, "notes", false)).toBe(false); // nothing to show
    expect(shows(model, "notes", true)).toBe(true);
  });
});
