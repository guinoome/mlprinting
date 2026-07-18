import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage } from "./processing";

async function syntheticPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe("processImage", () => {
  it("reads intrinsic dimensions from the decode", async () => {
    const input = await syntheticPng(800, 600);
    const result = await processImage(input);
    expect(result?.width).toBe(800);
    expect(result?.height).toBe(600);
  });

  it("generates a thumbnail no larger than 320px on its longest edge", async () => {
    const input = await syntheticPng(2000, 1000);
    const result = await processImage(input);
    const meta = await sharp(result!.thumbnail.buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(320);
    expect(meta.format).toBe("webp");
  });

  it("generates a preview no larger than 1280px on its longest edge", async () => {
    const input = await syntheticPng(3000, 1500);
    const result = await processImage(input);
    const meta = await sharp(result!.preview.buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1280);
    expect(meta.format).toBe("webp");
  });

  it("never upscales a source smaller than the target size", async () => {
    const input = await syntheticPng(100, 80);
    const result = await processImage(input);
    const meta = await sharp(result!.thumbnail.buffer).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(80);
  });

  it("returns null for undecodable input rather than throwing — the graceful-degradation path", async () => {
    const garbage = Buffer.from("this is not an image");
    await expect(processImage(garbage)).resolves.toBeNull();
  });
});
