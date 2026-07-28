import { describe, expect, it } from "vitest";
import {
  MAX_TEMPLATE_ASSET_BYTES,
  TEMPLATE_ASSET_ACCEPT,
  TEMPLATE_ASSET_EXTENSIONS,
  validateTemplateAsset,
} from "./index";

const good = {
  name: "rustic-garden.png",
  size: 400_000,
  type: "image/png",
};

describe("validateTemplateAsset", () => {
  it("accepts a designed cover", () => {
    expect(validateTemplateAsset(good)).toBeNull();
  });

  it("accepts every advertised extension", () => {
    const byExtension: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    for (const extension of TEMPLATE_ASSET_EXTENSIONS) {
      const result = validateTemplateAsset({
        name: `design${extension}`,
        size: 1000,
        type: byExtension[extension],
      });
      expect(result, `${extension} was rejected`).toBeNull();
    }
  });

  it("rejects an empty file", () => {
    expect(validateTemplateAsset({ ...good, size: 0 })?.code).toBe("empty");
  });

  it("rejects a file past the limit and says what the limit is", () => {
    const failure = validateTemplateAsset({
      ...good,
      size: MAX_TEMPLATE_ASSET_BYTES + 1,
    });
    expect(failure?.code).toBe("too-large");
    expect(failure?.message).toContain("10.0 MB");
  });

  it("accepts a file exactly at the limit", () => {
    // An off-by-one here rejects a file the UI just told the admin was fine.
    expect(
      validateTemplateAsset({ ...good, size: MAX_TEMPLATE_ASSET_BYTES }),
    ).toBeNull();
  });

  /**
   * The platform bans SVG everywhere (services/upload/constraints.ts) because
   * an SVG can carry script and we serve these from our own origin. Being
   * uploaded by an administrator does not change who gets attacked — every
   * visitor to the catalogue does — so the ban has to hold here too.
   */
  it("refuses SVG however it is presented", () => {
    expect(
      validateTemplateAsset({
        name: "design.svg",
        size: 1000,
        type: "image/svg+xml",
      })?.code,
    ).toBe("wrong-type");

    // Renamed to look raster.
    expect(
      validateTemplateAsset({
        name: "design.png",
        size: 1000,
        type: "image/svg+xml",
      })?.code,
    ).toBe("wrong-type");

    // Correct extension forged in the header.
    expect(
      validateTemplateAsset({
        name: "design.svg",
        size: 1000,
        type: "image/png",
      })?.code,
    ).toBe("wrong-type");
  });

  it("rejects documents and archives", () => {
    for (const [name, type] of [
      ["print.pdf", "application/pdf"],
      ["pack.zip", "application/zip"],
      ["run.exe", "application/octet-stream"],
      ["notes.txt", "text/plain"],
    ]) {
      expect(
        validateTemplateAsset({ name, size: 1000, type })?.code,
        name,
      ).toBe("wrong-type");
    }
  });

  it("is case-insensitive about both header and extension", () => {
    expect(
      validateTemplateAsset({
        name: "DESIGN.PNG",
        size: 1000,
        type: "IMAGE/PNG",
      }),
    ).toBeNull();
  });

  it("checks size before type, so a huge wrong file reads as too large", () => {
    // Reporting "wrong type" for a 900 MB video is technically true and
    // unhelpful; the admin's actual problem is the size.
    const failure = validateTemplateAsset({
      name: "clip.mov",
      size: 900 * 1024 * 1024,
      type: "video/quicktime",
    });
    expect(failure?.code).toBe("too-large");
  });
});

describe("TEMPLATE_ASSET_ACCEPT", () => {
  it("offers the file picker exactly what validation permits", () => {
    // These drifting apart is how an admin gets to choose a file that is then
    // rejected on submit.
    expect(TEMPLATE_ASSET_ACCEPT.split(",")).toEqual([
      ...TEMPLATE_ASSET_EXTENSIONS,
    ]);
  });
});
