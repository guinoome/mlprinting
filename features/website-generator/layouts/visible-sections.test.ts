import { describe, expect, it } from "vitest";
import type { EventKind, PreviewModel } from "@/lib/invitation/preview-model";
import { LAYOUTS, layoutFor } from "./registry";
import { sectionOrder, type SectionId } from "./types";
import { visibleSections } from "./visible-sections";

const KINDS = Object.keys(LAYOUTS) as EventKind[];

const STYLE: PreviewModel["style"] = {
  background: "#ffffff",
  foreground: "#111111",
  accent: "#b08d57",
  headingFont: "serif",
  bodyFont: "sans-serif",
  backgroundStyle: "plain",
  decorativeStyle: "none",
};

/** An invitation the customer has typed nothing into yet. */
function emptyModel(over: Partial<PreviewModel> = {}): PreviewModel {
  return {
    title: "Your event title",
    subtitle: null,
    dateLine: null,
    timeLine: null,
    hosts: [],
    venues: [],
    welcomeMessage: null,
    invitationMessage: null,
    parents: [],
    sponsors: [],
    program: [],
    giftsPreference: null,
    specialNotes: null,
    closingMessage: null,
    dressCode: null,
    eventTheme: null,
    rsvpLine: null,
    coverImageUrl: null,
    heroVideoUrl: null,
    galleryUrls: [],
    musicUrl: null,
    style: STYLE,
    eventKind: "general",
    hidden: new Set(),
    ...over,
  };
}

/** Every content-bearing field filled, so only the layout decides what shows. */
function fullModel(over: Partial<PreviewModel> = {}): PreviewModel {
  return emptyModel({
    hosts: [{ id: "h1", name: "Maria", biography: null }],
    venues: [
      {
        id: "v1",
        label: "Ceremony",
        name: "San Agustin",
        address: "Intramuros",
        mapsUrl: null,
        parkingNotes: null,
        timeLine: "3:00 PM",
      },
    ],
    welcomeMessage: "Welcome",
    invitationMessage: "Please join us",
    parents: [{ id: "p1", name: "Rosa", role: "Mother" }],
    sponsors: [{ id: "s1", name: "Ninong Ben", role: null }],
    program: [
      { id: "pr1", time: "15:00", title: "Ceremony", description: null },
    ],
    giftsPreference: "Your presence is enough",
    specialNotes: "Parking at the back",
    closingMessage: "See you there",
    dressCode: "Formal",
    galleryUrls: ["/a.jpg"],
    ...over,
  });
}

const ALL_ON = { hasCountdown: true, hasQr: true };
const ALL_OFF = { hasCountdown: false, hasQr: false };

describe("visibleSections", () => {
  it("renders a fully populated invitation in the layout's full order", () => {
    for (const kind of KINDS) {
      const layout = layoutFor(kind);
      expect(
        visibleSections(fullModel({ eventKind: kind }), layout, ALL_ON),
        `${kind} drops a section that has content`,
      ).toEqual(sectionOrder(layout));
    }
  });

  it("keeps only the always-on sections when nothing is filled in", () => {
    // An invitation opened before the customer has typed anything still has to
    // offer a reply — everything else is genuinely empty and must not leave a
    // labelled, blank block on the page.
    for (const kind of KINDS) {
      expect(
        visibleSections(emptyModel({ eventKind: kind }), layoutFor(kind), ALL_OFF),
        `${kind} shows an empty section`,
      ).toEqual(["rsvp"]);
    }
  });

  it("adds only the QR code when an empty invitation has one", () => {
    expect(
      visibleSections(emptyModel(), layoutFor("general"), {
        hasCountdown: false,
        hasQr: true,
      }),
    ).toEqual(["rsvp", "qr"]);
  });

  it("takes the countdown and the calendar actions from the event date", () => {
    const order = visibleSections(emptyModel(), layoutFor("general"), {
      hasCountdown: true,
      hasQr: false,
    });
    expect(order).toEqual(["countdown", "actions", "rsvp"]);
  });

  describe("ordering follows the layout, not the order the JSX was written in", () => {
    it("opens a reunion on its gallery, before the hosts", () => {
      const order = visibleSections(
        fullModel({ eventKind: "reunion" }),
        layoutFor("reunion"),
        ALL_ON,
      );
      expect(order.indexOf("gallery")).toBeLessThan(order.indexOf("hosts"));
    });

    it("opens a fiesta on its programme", () => {
      const order = visibleSections(
        fullModel({ eventKind: "fiesta" }),
        layoutFor("fiesta"),
        ALL_ON,
      );
      // Second only to the welcome: the procession schedule is what a fiesta
      // is about, and it used to sit two thirds of the way down the page.
      expect(order.indexOf("program")).toBe(1);
      expect(order.indexOf("program")).toBeLessThan(order.indexOf("venues"));
    });

    it("does not simply repeat the old hardcoded sequence", () => {
      // The sequence the renderer used before the layouts existed. If every
      // occasion still came out in this order, the seam would be doing nothing.
      const legacy: SectionId[] = [
        "welcome",
        "countdown",
        "actions",
        "invitation",
        "hosts",
        "parents",
        "sponsors",
        "venues",
        "program",
        "gallery",
        "dress-code",
        "gifts",
        "notes",
        "rsvp",
        "closing",
        "qr",
      ];
      for (const kind of KINDS) {
        const order = visibleSections(
          fullModel({ eventKind: kind }),
          layoutFor(kind),
          ALL_ON,
        );
        const projected = legacy.filter((id) => order.includes(id));
        if (kind !== "wedding") {
          expect(order, `${kind} still renders in the old sequence`).not.toEqual(
            projected,
          );
        }
      }
    });
  });

  it("never counts down to a memorial", () => {
    // Not an emptiness rule — the memorial layout has no countdown at all, so
    // a resolved event date must not smuggle one back in.
    const order = visibleSections(
      fullModel({ eventKind: "funeral" }),
      layoutFor("funeral"),
      ALL_ON,
    );
    expect(order).not.toContain("countdown" as SectionId);
    expect(order).not.toContain("actions" as SectionId);
  });

  it("ends every occasion on the QR code", () => {
    for (const kind of KINDS) {
      const order = visibleSections(
        fullModel({ eventKind: kind }),
        layoutFor(kind),
        ALL_ON,
      );
      expect(order.at(-1), `${kind} does not end on the QR code`).toBe("qr");
    }
  });

  it("omits the QR code entirely when the invitation has no image for it", () => {
    for (const kind of KINDS) {
      const order = visibleSections(fullModel({ eventKind: kind }), layoutFor(kind), {
        hasCountdown: true,
        hasQr: false,
      });
      expect(order, `${kind} renders a QR footer with no QR`).not.toContain(
        "qr" as SectionId,
      );
    }
  });

  describe("sections the customer switched off", () => {
    // Only these consult model.hidden; the rest are driven by content alone.
    // Kept as an explicit list so adding a hideable section is a decision here
    // rather than something that quietly does not take effect.
    const hideable: SectionId[] = [
      "welcome",
      "hosts",
      "parents",
      "sponsors",
      "venues",
      "program",
      "gallery",
      "dress-code",
      "gifts",
      "notes",
      "rsvp",
    ];

    for (const section of hideable) {
      it(`omits "${section}" for every occasion that offers it`, () => {
        for (const kind of KINDS) {
          const layout = layoutFor(kind);
          if (!sectionOrder(layout).includes(section)) continue;

          const shown = visibleSections(
            fullModel({ eventKind: kind }),
            layout,
            ALL_ON,
          );
          expect(shown, `${kind} never shows ${section} to begin with`).toContain(
            section,
          );

          const hiddenOrder = visibleSections(
            fullModel({ eventKind: kind, hidden: new Set([section]) }),
            layout,
            ALL_ON,
          );
          expect(
            hiddenOrder,
            `${kind} still shows ${section} after it was switched off`,
          ).not.toContain(section);
          expect(hiddenOrder).toEqual(shown.filter((id) => id !== section));
        }
      });
    }

    it("leaves the rest of the order untouched when several are switched off", () => {
      const layout = layoutFor("wedding");
      const model = fullModel({
        eventKind: "wedding",
        hidden: new Set(["parents", "sponsors", "gifts"]),
      });
      expect(visibleSections(model, layout, ALL_ON)).toEqual(
        sectionOrder(layout).filter(
          (id) => !["parents", "sponsors", "gifts"].includes(id),
        ),
      );
    });
  });

  describe("emptiness, field by field", () => {
    // The layout that carries every section, so each field can be tested
    // without an occasion's ordering hiding the result.
    const layout = layoutFor("general");

    const cases: [SectionId, Partial<PreviewModel>][] = [
      ["welcome", { welcomeMessage: "Welcome" }],
      ["invitation", { invitationMessage: "Please join us" }],
      ["hosts", { hosts: [{ id: "h1", name: "Maria", biography: null }] }],
      ["program", { program: [{ id: "p", time: null, title: "Mass", description: null }] }],
      ["gallery", { galleryUrls: ["/a.jpg"] }],
      ["dress-code", { dressCode: "Formal" }],
      ["gifts", { giftsPreference: "No gifts" }],
      ["notes", { specialNotes: "Park at the back" }],
      ["closing", { closingMessage: "See you there" }],
    ];

    for (const [section, filled] of cases) {
      it(`shows "${section}" only once it has content`, () => {
        expect(visibleSections(emptyModel(), layout, ALL_OFF)).not.toContain(
          section,
        );
        expect(
          visibleSections(emptyModel(filled), layout, ALL_OFF),
        ).toContain(section);
      });
    }

    it("treats an empty string as nothing to show", () => {
      // The editor writes "" rather than null when a field is cleared.
      expect(
        visibleSections(emptyModel({ welcomeMessage: "" }), layout, ALL_OFF),
      ).not.toContain("welcome" as SectionId);
    });
  });

  it("never invents a section the layout did not ask for", () => {
    for (const kind of KINDS) {
      const layout = layoutFor(kind);
      const order = visibleSections(
        fullModel({ eventKind: kind }),
        layout,
        ALL_ON,
      );
      const allowed = new Set(sectionOrder(layout));
      for (const id of order) {
        expect(allowed.has(id), `${kind} rendered an unlisted ${id}`).toBe(true);
      }
      expect(new Set(order).size, `${kind} repeats a section`).toBe(order.length);
    }
  });
});
