import type { UploadKind, UploadConstraints } from "./types";

/**
 * Upload limits — Ph1.md §8 (Images, Documents).
 *
 * Values are conservative on purpose. Raising a limit later is a one-line
 * change; lowering one after customers have uploaded 40 MB TIFFs is a
 * migration and an apology.
 *
 * SVG is absent from the image list deliberately. An SVG is a document that can
 * carry script, and serving a user-uploaded one from our origin hands an
 * attacker stored XSS against every visitor. If Ph4 needs vector artwork, it
 * needs a sanitiser and its own decision — not a quiet addition to this array.
 */
export const UPLOAD_CONSTRAINTS: Record<UploadKind, UploadConstraints> = {
  image: {
    maxBytes: 10 * 1024 * 1024, // 10 MB — a phone photo, comfortably.
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".heic"],
  },
  document: {
    maxBytes: 20 * 1024 * 1024, // 20 MB — a print-ready PDF.
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
  },
};
