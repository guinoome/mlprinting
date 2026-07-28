import { describe, expect, it } from "vitest";
import { LAYOUTS, layoutFor } from "./registry";
import { sectionOrder, type InvitationLayout, type SectionId } from "./types";

const ALL = Object.entries(LAYOUTS) as [string, InvitationLayout][];

describe("layout registry", () => {
  it("gives every occasion a layout", () => {
    for (const [kind, layout] of ALL) {
      expect(layout.id, `${kind} has no layout id`).toBeTruthy();
      expect(layout.sections.length, `${kind} renders nothing`).toBeGreaterThan(2);
    }
  });

  it("uses a unique id per occasion", () => {
    const ids = ALL.map(([, l]) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The brief's actual instruction, as a test: "avoid cloning one template into
   * multiple colour variations". Colour already varies by occasion, so two
   * layouts that agree on hero, ornament and section order are the same design
   * wearing two palettes — which is the thing being warned against.
   */
  it("does not repeat a structure across occasions", () => {
    const seen = new Map<string, string>();
    for (const [kind, layout] of ALL) {
      const shape = `${layout.hero}|${layout.ornament}|${layout.sections.join(",")}`;
      const clash = seen.get(shape);
      expect(
        clash,
        `${kind} has the same hero, ornament and ordering as ${clash}`,
      ).toBeUndefined();
      seen.set(shape, kind);
    }
  });

  it("varies the hero across the library rather than restyling one", () => {
    const heroes = new Set(ALL.map(([, l]) => l.hero));
    expect(heroes.size).toBeGreaterThanOrEqual(5);
  });

  it("never renders a section twice in one layout", () => {
    for (const [kind, layout] of ALL) {
      const order = sectionOrder(layout);
      expect(new Set(order).size, `${kind} repeats a section`).toBe(order.length);
    }
  });

  it("ends every invitation with the QR code", () => {
    // Standing requirement across both briefs: it sits near the bottom of every
    // design, so no layout is allowed to drop or relocate it.
    for (const [kind, layout] of ALL) {
      const order = sectionOrder(layout);
      expect(order.at(-1), `${kind} does not end on the QR code`).toBe("qr");
    }
  });

  it("always offers a way to reply", () => {
    for (const [kind, layout] of ALL) {
      expect(sectionOrder(layout), `${kind} has no RSVP`).toContain(
        "rsvp" as SectionId,
      );
    }
  });

  describe("memorial, religious and community", () => {
    const solemn = ["funeral", "religious", "community"] as const;

    it("are not celebratory", () => {
      for (const kind of solemn) {
        expect(LAYOUTS[kind].celebratory, `${kind} is marked celebratory`).toBe(
          false,
        );
      }
    });

    it("carry no festive ornament", () => {
      for (const kind of solemn) {
        expect(LAYOUTS[kind].ornament).not.toBe("confetti");
      }
    });

    it("never count down to a memorial", () => {
      // Counting down to a funeral is what a system does when nobody thought
      // about the occasion it was rendering.
      expect(sectionOrder(LAYOUTS.funeral)).not.toContain("countdown" as SectionId);
    });

    it("keeps a gift registry off a memorial's front half", () => {
      const order = sectionOrder(LAYOUTS.funeral);
      const gifts = order.indexOf("gifts" as SectionId);
      if (gifts >= 0) expect(gifts).toBeGreaterThan(order.length / 2);
    });
  });

  describe("date style", () => {
    /**
     * Both treatments have to be in real use. A field every occasion answers
     * the same way is not a choice — it is a constant with extra steps, and the
     * renderer branch behind it would never be exercised.
     */
    it("uses both treatments across the library", () => {
      const used = new Set(ALL.map(([, l]) => l.dateStyle));
      expect(used).toEqual(new Set(["line", "row"]));
    });

    /**
     * The row is a device: a large numeral flanked by rules. It suits a
     * celebration, and it is the wrong register for a memorial notice, a mass
     * or a barangay announcement, where a date should be stated rather than
     * performed.
     */
    it("keeps the numeral device off the solemn occasions", () => {
      for (const kind of ["funeral", "religious", "community"] as const) {
        expect(LAYOUTS[kind].dateStyle, `${kind} performs its date`).toBe(
          "line",
        );
      }
    });
  });

  it("falls back to the neutral layout for an unknown occasion", () => {
    expect(layoutFor("general")).toBe(LAYOUTS.general);
  });
});
