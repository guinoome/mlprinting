import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { localRemasterProvider } from "./local-provider";

describe("localRemasterProvider", () => {
  it("returns a bounded WebP derivative without changing the input", async () => {
    const original = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "#777" },
    })
      .jpeg()
      .toBuffer();
    const snapshot = Buffer.from(original);

    const output = await localRemasterProvider.remaster(original);

    expect(output).not.toBeNull();
    expect(output?.contentType).toBe("image/webp");
    expect(output?.width).toBe(2048);
    expect(output?.height).toBe(1024);
    expect(original.equals(snapshot)).toBe(true);
  });
});
