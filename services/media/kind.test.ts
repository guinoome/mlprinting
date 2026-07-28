import { describe, expect, it } from "vitest";
import { mediaKindForMime } from "./kind";
import { UPLOAD_CONSTRAINTS } from "@/services/upload/constraints";
import { uploadKindForMime } from "@/services/upload/validation";
import type { UploadKind } from "@/services/upload/types";

describe("mediaKindForMime", () => {
  it("maps the families it knows", () => {
    expect(mediaKindForMime("video/mp4")).toBe("VIDEO");
    expect(mediaKindForMime("video/webm")).toBe("VIDEO");
    expect(mediaKindForMime("image/jpeg")).toBe("IMAGE");
    expect(mediaKindForMime("audio/mpeg")).toBe("AUDIO");
    expect(mediaKindForMime("application/pdf")).toBe("DOCUMENT");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(mediaKindForMime(" VIDEO/MP4 ")).toBe("VIDEO");
  });

  it("falls back to IMAGE rather than throwing", () => {
    // Nothing reaches this without passing validateUpload, so an unknown type
    // means the tables below disagree — a wrong row beats a 500 on a file the
    // platform already accepted.
    expect(mediaKindForMime("application/x-unknown")).toBe("IMAGE");
  });

  /**
   * The pairing that would otherwise drift silently.
   *
   * Every MIME type the platform accepts must land on the kind its upload
   * category implies. Adding a format to UPLOAD_CONSTRAINTS without teaching
   * this map about it would store, say, an AVI as an IMAGE — a row that is
   * wrong in a way nothing else in the system would notice.
   */
  it("agrees with every type the upload constraints accept", () => {
    const expected: Record<UploadKind, string> = {
      image: "IMAGE",
      video: "VIDEO",
      document: "DOCUMENT",
    };

    for (const kind of Object.keys(UPLOAD_CONSTRAINTS) as UploadKind[]) {
      for (const mime of UPLOAD_CONSTRAINTS[kind].mimeTypes) {
        expect(mediaKindForMime(mime), `${mime} (${kind})`).toBe(
          expected[kind],
        );
      }
    }
  });
});

describe("uploadKindForMime", () => {
  it("routes a file to the rules that should judge it", () => {
    expect(uploadKindForMime("image/png")).toBe("image");
    expect(uploadKindForMime("video/mp4")).toBe("video");
    expect(uploadKindForMime("application/pdf")).toBe("document");
  });

  it("refuses a type no category claims", () => {
    expect(uploadKindForMime("application/zip")).toBeNull();
    expect(uploadKindForMime("image/svg+xml")).toBeNull();
    // QuickTime is recorded by every iPhone and decoded by nowhere reliable.
    expect(uploadKindForMime("video/quicktime")).toBeNull();
  });

  it("resolves every advertised type to exactly its own category", () => {
    for (const kind of Object.keys(UPLOAD_CONSTRAINTS) as UploadKind[]) {
      for (const mime of UPLOAD_CONSTRAINTS[kind].mimeTypes) {
        expect(uploadKindForMime(mime), mime).toBe(kind);
      }
    }
  });

  it("does not let one category claim another's type", () => {
    // Two categories advertising the same MIME type would make the routing
    // depend on key order, which is not a decision anybody made.
    const seen = new Set<string>();
    for (const kind of Object.keys(UPLOAD_CONSTRAINTS) as UploadKind[]) {
      for (const mime of UPLOAD_CONSTRAINTS[kind].mimeTypes) {
        expect(seen.has(mime), `${mime} is claimed twice`).toBe(false);
        seen.add(mime);
      }
    }
  });
});
