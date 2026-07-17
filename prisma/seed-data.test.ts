import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  COLLECTIONS,
  TEMPLATES,
  seedColors,
  seedStyles,
} from "./seed-data";
import { DEFAULT_PAGE_SIZE } from "../features/template-marketplace/criteria";

/**
 * These assert the seed is *coherent*, not that it is pretty. A broken seed
 * fails at `prisma db seed` against a real database — long after the mistake,
 * and usually on someone else's machine.
 */

describe("seed categories", () => {
  it("covers every event type Ph2 §1 names", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    for (const required of [
      "wedding",
      "birthday",
      "christening",
      "corporate",
      "debut",
      "anniversary",
      "graduation",
    ]) {
      expect(slugs).toContain(required);
    }
  });

  it("includes Custom, which Ph2 §1 requires", () => {
    expect(CATEGORIES.map((c) => c.slug)).toContain("custom");
  });

  it("has unique slugs — the seed upserts on them", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("sorts Custom last", () => {
    const custom = CATEGORIES.find((c) => c.slug === "custom")!;
    const others = CATEGORIES.filter((c) => c.slug !== "custom");
    for (const category of others) {
      expect(custom.sortOrder).toBeGreaterThan(category.sortOrder);
    }
  });
});

describe("seed collections", () => {
  it("has unique slugs", () => {
    const slugs = COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every seasonal collection a window — the window is why they exist", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.activeFrom).toBeTruthy();
      expect(collection.activeTo).toBeTruthy();
    }
  });

  it("uses MM-DD bounds", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.activeFrom).toMatch(/^\d{2}-\d{2}$/);
      expect(collection.activeTo).toMatch(/^\d{2}-\d{2}$/);
    }
  });
});

describe("seed templates — referential integrity", () => {
  it("names only categories that are seeded", () => {
    const known = new Set(CATEGORIES.map((c) => c.slug));
    for (const template of TEMPLATES) {
      expect(known).toContain(template.category);
    }
  });

  it("names only collections that are seeded", () => {
    const known = new Set(COLLECTIONS.map((c) => c.slug));
    for (const template of TEMPLATES) {
      for (const collection of template.collections ?? []) {
        expect(known).toContain(collection);
      }
    }
  });

  it("has unique slugs — the seed upserts on them", () => {
    const slugs = TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const template of TEMPLATES) {
      expect(template.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("seed templates — exercises the marketplace", () => {
  it("fills more than one page, so pagination is actually tested", () => {
    const published = TEMPLATES.filter((t) => t.publishedDaysAgo >= 0);
    expect(published.length).toBeGreaterThan(DEFAULT_PAGE_SIZE);
  });

  it("includes an unpublished draft, to prove the publication filter against a real DB", () => {
    expect(TEMPLATES.some((t) => t.publishedDaysAgo < 0)).toBe(true);
  });

  it("spans both tiers", () => {
    expect(TEMPLATES.some((t) => t.tier === "FREE")).toBe(true);
    expect(TEMPLATES.some((t) => t.tier === "PREMIUM")).toBe(true);
  });

  it("spans every orientation", () => {
    for (const orientation of ["PORTRAIT", "LANDSCAPE", "SQUARE"]) {
      expect(TEMPLATES.some((t) => t.orientation === orientation)).toBe(true);
    }
  });

  it("includes templates inside and outside the 30-day New window", () => {
    expect(
      TEMPLATES.some((t) => t.publishedDaysAgo >= 0 && t.publishedDaysAgo < 30),
    ).toBe(true);
    expect(TEMPLATES.some((t) => t.publishedDaysAgo > 30)).toBe(true);
  });

  it("includes featured and unfeatured templates", () => {
    expect(TEMPLATES.some((t) => t.isFeatured)).toBe(true);
    expect(TEMPLATES.some((t) => !t.isFeatured)).toBe(true);
  });

  it("does not make every template compatible with everything", () => {
    // Ph2 §7's compatibility flags are meaningless if they are uniformly true.
    expect(TEMPLATES.some((t) => !t.printCompatible)).toBe(true);
    expect(TEMPLATES.some((t) => !t.websiteCompatible)).toBe(true);
  });

  it("gives distinct use counts, so Most Popular has an observable order", () => {
    const published = TEMPLATES.filter((t) => t.publishedDaysAgo >= 0);
    const counts = published.map((t) => t.useCount);
    expect(new Set(counts).size).toBeGreaterThan(published.length / 2);
  });

  it("populates every filter facet on every published template", () => {
    for (const template of TEMPLATES.filter((t) => t.publishedDaysAgo >= 0)) {
      expect(template.colors.length).toBeGreaterThan(0);
      expect(template.styles.length).toBeGreaterThan(0);
      expect(template.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("seed templates — content", () => {
  it("gives every template a short description short enough for a card", () => {
    for (const template of TEMPLATES) {
      expect(template.shortDescription.length).toBeGreaterThan(0);
      expect(template.shortDescription.length).toBeLessThanOrEqual(60);
    }
  });

  it("gives every template a fuller description than its card line", () => {
    for (const template of TEMPLATES) {
      expect(template.description.length).toBeGreaterThan(
        template.shortDescription.length,
      );
    }
  });

  it("uses lowercase facet values — buildWhere matches array columns case-sensitively", () => {
    for (const template of TEMPLATES) {
      for (const value of [
        ...template.colors,
        ...template.styles,
        ...template.tags,
      ]) {
        expect(value).toBe(value.toLowerCase());
      }
    }
  });
});

describe("derived vocabularies", () => {
  it("derives colours from the templates, so they cannot drift", () => {
    const colors = seedColors();
    expect(colors).toContain("blush");
    expect(colors).toEqual([...colors].sort());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("derives styles from the templates", () => {
    const styles = seedStyles();
    expect(styles).toContain("modern");
    expect(new Set(styles).size).toBe(styles.length);
  });
});
