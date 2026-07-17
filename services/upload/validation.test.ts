import { describe, expect, it } from "vitest";
import { validateUpload, extensionOf, acceptAttribute } from "./validation";
import { UPLOAD_CONSTRAINTS } from "./constraints";

const image = (
  over: Partial<{ name: string; size: number; type: string }> = {},
) => ({
  name: "photo.jpg",
  size: 1024,
  type: "image/jpeg",
  ...over,
});

describe("extensionOf", () => {
  it("returns the lowercased extension", () => {
    expect(extensionOf("Photo.JPG")).toBe(".jpg");
  });

  it("uses the last dot", () => {
    expect(extensionOf("my.holiday.photo.png")).toBe(".png");
  });

  it("returns empty for no extension", () => {
    expect(extensionOf("README")).toBe("");
  });

  it("treats a dotfile as having no extension", () => {
    // ".env" is a filename, not an extension — and it is exactly the sort of
    // thing that must not sneak past an extension allowlist.
    expect(extensionOf(".env")).toBe("");
  });
});

describe("validateUpload — images", () => {
  it("accepts a normal photo", () => {
    expect(validateUpload(image(), "image")).toBeNull();
  });

  it("accepts regardless of extension case", () => {
    expect(validateUpload(image({ name: "PHOTO.JPEG" }), "image")).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateUpload(image({ size: 0 }), "image")?.code).toBe("empty");
  });

  it("rejects a file over the size limit", () => {
    const tooBig = UPLOAD_CONSTRAINTS.image.maxBytes + 1;
    const failure = validateUpload(image({ size: tooBig }), "image");
    expect(failure?.code).toBe("too-large");
    expect(failure?.message).toContain("10.0 MB");
  });

  it("accepts a file exactly at the limit", () => {
    expect(
      validateUpload(
        image({ size: UPLOAD_CONSTRAINTS.image.maxBytes }),
        "image",
      ),
    ).toBeNull();
  });

  it("rejects a disallowed type", () => {
    expect(
      validateUpload(image({ name: "a.gif", type: "image/gif" }), "image")
        ?.code,
    ).toBe("wrong-type");
  });

  it("rejects SVG, which can carry script", () => {
    const failure = validateUpload(
      image({ name: "logo.svg", type: "image/svg+xml" }),
      "image",
    );
    expect(failure?.code).toBe("wrong-type");
  });

  it("rejects an executable wearing an image MIME type", () => {
    // Forged Content-Type, real extension.
    const failure = validateUpload(
      image({ name: "payload.exe", type: "image/png" }),
      "image",
    );
    expect(failure?.code).toBe("wrong-type");
  });

  it("rejects an executable wearing an image extension", () => {
    // Real Content-Type, forged extension. The mirror of the case above.
    const failure = validateUpload(
      image({ name: "payload.png", type: "application/x-msdownload" }),
      "image",
    );
    expect(failure?.code).toBe("wrong-type");
  });

  it("rejects a PDF offered as an image", () => {
    expect(
      validateUpload(
        image({ name: "doc.pdf", type: "application/pdf" }),
        "image",
      )?.code,
    ).toBe("wrong-type");
  });
});

describe("validateUpload — documents", () => {
  const pdf = { name: "invitation.pdf", size: 2048, type: "application/pdf" };

  it("accepts a PDF", () => {
    expect(validateUpload(pdf, "document")).toBeNull();
  });

  it("rejects an image offered as a document", () => {
    expect(validateUpload(image(), "document")?.code).toBe("wrong-type");
  });

  it("allows documents a larger budget than images", () => {
    expect(UPLOAD_CONSTRAINTS.document.maxBytes).toBeGreaterThan(
      UPLOAD_CONSTRAINTS.image.maxBytes,
    );
  });
});

describe("acceptAttribute", () => {
  it("lists the allowed extensions for a file input", () => {
    expect(acceptAttribute("document")).toBe(".pdf");
    expect(acceptAttribute("image")).toContain(".jpg");
  });
});
