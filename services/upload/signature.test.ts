import { describe, expect, it } from "vitest";
import { uploadSignatureMatches } from "./signature";

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("uploadSignatureMatches", () => {
  it("accepts matching image, video, and PDF container signatures", async () => {
    await expect(
      uploadSignatureMatches(
        file([0xff, 0xd8, 0xff, 0xdb], "a.jpg", "image/jpeg"),
        "image",
      ),
    ).resolves.toBe(true);
    await expect(
      uploadSignatureMatches(
        file([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70], "a.mp4", "video/mp4"),
        "video",
      ),
    ).resolves.toBe(true);
    await expect(
      uploadSignatureMatches(
        file([0x25, 0x50, 0x44, 0x46, 0x2d], "a.pdf", "application/pdf"),
        "document",
      ),
    ).resolves.toBe(true);
  });

  it("rejects executable bytes wearing an allowed name and MIME type", async () => {
    await expect(
      uploadSignatureMatches(
        file([0x4d, 0x5a, 0x90, 0], "a.jpg", "image/jpeg"),
        "image",
      ),
    ).resolves.toBe(false);
  });
});
