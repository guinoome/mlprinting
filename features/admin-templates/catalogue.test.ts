import { describe, expect, it } from "vitest";
import {
  canDelete,
  removalPlan,
  slugifyTemplateName,
  uniqueSlug,
  validateNewTemplate,
  type NewTemplateInput,
} from "./catalogue";

const unused = { invitations: 0, uses: 0, favorites: 0 };

describe("removalPlan", () => {
  it("always offers unpublish", () => {
    expect(removalPlan(unused).available).toContain("unpublish");
    expect(removalPlan({ ...unused, invitations: 9 }).available).toContain(
      "unpublish",
    );
  });

  it("offers delete only when no invitation uses the design", () => {
    expect(canDelete(unused)).toBe(true);
    expect(canDelete({ ...unused, invitations: 1 })).toBe(false);
  });

  /**
   * Views, favourites and "recently used" rows all cascade-delete, so they
   * cost a customer nothing. Blocking on them would make a template that one
   * person once glanced at permanently undeletable.
   */
  it("is not blocked by analytics rows", () => {
    expect(canDelete({ invitations: 0, uses: 400, favorites: 25 })).toBe(true);
  });

  it("explains the block in numbers, not adjectives", () => {
    expect(removalPlan({ ...unused, invitations: 1 }).blockedReason).toContain(
      "1 invitation uses",
    );
    expect(removalPlan({ ...unused, invitations: 3 }).blockedReason).toContain(
      "3 invitations use",
    );
  });

  it("says nothing when nothing is blocked", () => {
    expect(removalPlan(unused).blockedReason).toBe("");
  });
});

describe("slugifyTemplateName", () => {
  it("makes a web address out of a display name", () => {
    expect(slugifyTemplateName("Ivory Lace")).toBe("ivory-lace");
    expect(slugifyTemplateName("  Sampaguita   Dream  ")).toBe(
      "sampaguita-dream",
    );
  });

  it("keeps an ampersand as a word rather than dropping it", () => {
    // "Bride & Groom" and "Bride Groom" are different names and deserve
    // different addresses.
    expect(slugifyTemplateName("Bride & Groom")).toBe("bride-and-groom");
  });

  it("strips accents instead of hyphenating them", () => {
    expect(slugifyTemplateName("Piña Colada")).toBe("pina-colada");
    expect(slugifyTemplateName("Café Noir")).toBe("cafe-noir");
  });

  it("never ends on a hyphen, even when truncating", () => {
    const slug = slugifyTemplateName(`${"long name ".repeat(20)}`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns nothing when there is nothing to work with", () => {
    // The caller treats this as a validation failure rather than inventing one.
    expect(slugifyTemplateName("!!!")).toBe("");
    expect(slugifyTemplateName("   ")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("uses the base when it is free", () => {
    expect(uniqueSlug("ivory-lace", [])).toBe("ivory-lace");
  });

  it("suffixes rather than overwriting a taken slug", () => {
    expect(uniqueSlug("ivory-lace", ["ivory-lace"])).toBe("ivory-lace-2");
    expect(uniqueSlug("ivory-lace", ["ivory-lace", "ivory-lace-2"])).toBe(
      "ivory-lace-3",
    );
  });

  it("falls back to a name rather than an empty address", () => {
    expect(uniqueSlug("", [])).toBe("template");
  });
});

describe("validateNewTemplate", () => {
  const good: NewTemplateInput = {
    name: "Sampaguita Dream",
    categoryId: "cat-1",
    shortDescription: "Soft white florals on ivory.",
    description: "A quiet floral design for a garden wedding.",
    designer: "ML Printing",
  };

  it("accepts a filled-in form", () => {
    expect(validateNewTemplate(good)).toEqual({});
  });

  it("names every empty field", () => {
    const errors = validateNewTemplate({
      name: "",
      categoryId: "",
      shortDescription: "",
      description: "",
      designer: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "categoryId",
      "description",
      "designer",
      "name",
      "shortDescription",
    ]);
  });

  it("rejects a name that would leave the template with no address", () => {
    expect(validateNewTemplate({ ...good, name: "???" }).name).toBeTruthy();
  });

  it("caps the two fields the catalogue has to lay out", () => {
    expect(validateNewTemplate({ ...good, name: "x".repeat(81) }).name).toBeTruthy();
    expect(
      validateNewTemplate({ ...good, shortDescription: "x".repeat(141) })
        .shortDescription,
    ).toBeTruthy();
  });

  it("treats whitespace as empty", () => {
    expect(validateNewTemplate({ ...good, designer: "   " }).designer).toBeTruthy();
  });
});
