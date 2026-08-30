import { describe, expect, it } from "vitest";
import { assetObjectPath, hasVariants, remasterObjectPath } from "./paths";

describe("assetObjectPath", () => {
  it("builds the original path using the caller's extension", () => {
    expect(assetObjectPath("user-1", "asset-1", 1, "original", ".jpg")).toBe(
      "user-1/asset-1/v1/original.jpg",
    );
  });

  it("builds thumbnail and preview paths as .webp regardless of the original extension", () => {
    expect(assetObjectPath("user-1", "asset-1", 1, "thumbnail", ".heic")).toBe(
      "user-1/asset-1/v1/thumbnail.webp",
    );
    expect(assetObjectPath("user-1", "asset-1", 1, "preview", ".heic")).toBe(
      "user-1/asset-1/v1/preview.webp",
    );
  });

  it("embeds the version so a replace never collides with the prior version's objects", () => {
    expect(assetObjectPath("user-1", "asset-1", 2, "original", ".png")).toBe(
      "user-1/asset-1/v2/original.png",
    );
  });
});

describe("remasterObjectPath", () => {
  it("binds a derivative to its source version and unique id", () => {
    expect(remasterObjectPath("user-1", "asset-1", 3, "remaster-1")).toBe(
      "user-1/asset-1/v3/remaster/remaster-1.webp",
    );
  });
});

describe("hasVariants", () => {
  it("is true once width is known", () => {
    expect(hasVariants({ width: 800 })).toBe(true);
  });

  it("is false when width is null — the graceful-degradation signal", () => {
    expect(hasVariants({ width: null })).toBe(false);
  });
});
