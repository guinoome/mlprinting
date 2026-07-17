import { describe, expect, it } from "vitest";
import {
  COLOR_THEMES,
  TYPOGRAPHY_SETS,
  BACKGROUND_STYLES,
  DECORATIVE_STYLES,
  TOGGLEABLE_SECTIONS,
  DESIGN_DEFAULTS,
  isColorTheme,
  isTypography,
  isBackgroundStyle,
  isDecorativeStyle,
  isToggleableSection,
  colorTheme,
  typography,
} from "./design-vocabulary";

const ALL = [
  ["colour themes", COLOR_THEMES],
  ["typography sets", TYPOGRAPHY_SETS],
  ["background styles", BACKGROUND_STYLES],
  ["decorative styles", DECORATIVE_STYLES],
  ["sections", TOGGLEABLE_SECTIONS],
] as const;

describe("design vocabulary — shape", () => {
  for (const [label, options] of ALL) {
    it(`${label}: slugs are unique`, () => {
      const slugs = options.map((o) => o.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it(`${label}: slugs are URL-safe`, () => {
      for (const option of options) expect(option.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it(`${label}: every option is described`, () => {
      // The description is what makes this a guided interview rather than a
      // list of jargon (Ph3.md UI Requirements).
      for (const option of options) {
        expect(option.name.length).toBeGreaterThan(0);
        expect(option.description.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("design vocabulary — validators are closed", () => {
  it("accepts every listed slug", () => {
    for (const option of COLOR_THEMES)
      expect(isColorTheme(option.slug)).toBe(true);
    for (const option of TYPOGRAPHY_SETS)
      expect(isTypography(option.slug)).toBe(true);
    for (const option of BACKGROUND_STYLES)
      expect(isBackgroundStyle(option.slug)).toBe(true);
    for (const option of DECORATIVE_STYLES)
      expect(isDecorativeStyle(option.slug)).toBe(true);
    for (const option of TOGGLEABLE_SECTIONS)
      expect(isToggleableSection(option.slug)).toBe(true);
  });

  it("rejects anything unlisted — this is what keeps §6 enforceable", () => {
    expect(isColorTheme("hot-pink")).toBe(false);
    expect(isTypography("comic-sans")).toBe(false);
    expect(isBackgroundStyle("animated-gif")).toBe(false);
    expect(isDecorativeStyle("clipart")).toBe(false);
    expect(isToggleableSection("everything")).toBe(false);
  });

  it("rejects a raw colour value, which is the whole point", () => {
    // If this ever passes, someone has added a hex column and Ph3.md §6 is dead.
    expect(isColorTheme("#ff0000")).toBe(false);
    expect(isColorTheme("rgb(255,0,0)")).toBe(false);
  });

  it("rejects empty and whitespace", () => {
    expect(isColorTheme("")).toBe(false);
    expect(isTypography(" ")).toBe(false);
  });
});

describe("design defaults", () => {
  it("every default is itself a valid option", () => {
    // The schema declares these as column defaults. If one is not in the
    // vocabulary, every new invitation starts invalid.
    expect(isColorTheme(DESIGN_DEFAULTS.colorTheme)).toBe(true);
    expect(isTypography(DESIGN_DEFAULTS.typography)).toBe(true);
    expect(isBackgroundStyle(DESIGN_DEFAULTS.backgroundStyle)).toBe(true);
    expect(isDecorativeStyle(DESIGN_DEFAULTS.decorativeStyle)).toBe(true);
  });

  it("defaults to the most conservative options", () => {
    expect(DESIGN_DEFAULTS.decorativeStyle).toBe("none");
    expect(DESIGN_DEFAULTS.backgroundStyle).toBe("plain");
  });
});

describe("colour themes", () => {
  it("carries a swatch for the chooser", () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.swatch.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.swatch.foreground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.swatch.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("offers a dark theme and a monochrome one", () => {
    expect(COLOR_THEMES.map((t) => t.slug)).toContain("midnight-navy");
    expect(COLOR_THEMES.map((t) => t.slug)).toContain("monochrome");
  });
});

describe("typography", () => {
  it("pairs heading and body rather than offering fonts separately", () => {
    // Ph3.md UI Requirements: a guided interview, not design software. One
    // decision per pairing is a decision that cannot go wrong.
    for (const set of TYPOGRAPHY_SETS) {
      expect(set.preview.heading.length).toBeGreaterThan(0);
      expect(set.preview.body.length).toBeGreaterThan(0);
    }
  });
});

describe("lookups", () => {
  it("resolves a known slug", () => {
    expect(colorTheme("midnight-navy").name).toBe("Midnight Navy");
    expect(typography("modern-sans").name).toBe("Modern Sans");
  });

  it("falls back to the first option rather than throwing on an unknown slug", () => {
    // A row written before an option was retired must still render.
    expect(colorTheme("retired-theme").slug).toBe("classic-ivory");
    expect(typography("retired-font").slug).toBe("classic-serif");
  });
});

describe("toggleable sections", () => {
  it("does not offer to hide the event heading", () => {
    // A toggle that produces a broken invitation is a trap, not a choice.
    expect(TOGGLEABLE_SECTIONS.map((s) => s.slug)).not.toContain("event");
    expect(TOGGLEABLE_SECTIONS.map((s) => s.slug)).not.toContain("title");
  });

  it("points each section at the step that fills it", () => {
    for (const section of TOGGLEABLE_SECTIONS) {
      expect(section.step.length).toBeGreaterThan(0);
    }
  });
});
