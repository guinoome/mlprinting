import { describe, expect, it } from "vitest";
import { pdfObjectPath } from "./paths";

describe("pdfObjectPath", () => {
  it("scopes the object under the owning profile", () => {
    expect(pdfObjectPath("profile-1", "inv-1", "gen-1").startsWith("profile-1/")).toBe(
      true,
    );
  });

  it("gives each generation its own object", () => {
    expect(pdfObjectPath("p", "i", "gen-1")).not.toBe(
      pdfObjectPath("p", "i", "gen-2"),
    );
  });

  it("ends in .pdf", () => {
    expect(pdfObjectPath("p", "i", "g").endsWith(".pdf")).toBe(true);
  });
});
