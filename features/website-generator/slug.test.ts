import { describe, expect, it } from "vitest";
import { normalizeSlug, validateSlug } from "./slug";

describe("normalizeSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeSlug("  Ana-And-Ben  ")).toBe("ana-and-ben");
  });
});

describe("validateSlug", () => {
  it("accepts a well-formed slug", () => {
    expect(validateSlug("ana-and-ben-2026")).toBeNull();
  });

  it("accepts a slug with no hyphens", () => {
    expect(validateSlug("anaandben")).toBeNull();
  });

  it("rejects a slug shorter than 3 characters", () => {
    expect(validateSlug("ab")?.code).toBe("too-short");
  });

  it("rejects a slug longer than 60 characters", () => {
    expect(validateSlug("a".repeat(61))?.code).toBe("too-long");
  });

  it("accepts a slug at exactly 60 characters", () => {
    expect(validateSlug("a".repeat(60))).toBeNull();
  });

  it("rejects uppercase letters", () => {
    expect(validateSlug("Ana-Ben")?.code).toBe("invalid-characters");
  });

  it("rejects spaces", () => {
    expect(validateSlug("ana and ben")?.code).toBe("invalid-characters");
  });

  it("rejects a leading hyphen", () => {
    expect(validateSlug("-ana-ben")?.code).toBe("invalid-characters");
  });

  it("rejects a trailing hyphen", () => {
    expect(validateSlug("ana-ben-")?.code).toBe("invalid-characters");
  });

  it("rejects a doubled hyphen", () => {
    expect(validateSlug("ana--ben")?.code).toBe("invalid-characters");
  });

  it("rejects an underscore", () => {
    expect(validateSlug("ana_ben")?.code).toBe("invalid-characters");
  });
});
