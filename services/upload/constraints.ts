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
  /**
   * Hero background video — increment 5 of docs/invitation-design-language.md.
   *
   * Two containers, both of which every current browser plays, and no
   * transcoding: the platform has no ffmpeg, and a serverless function is the
   * wrong place to acquire one. What a customer uploads is what a guest
   * downloads, which is exactly why the ceiling is low — 50 MB over a Philippine
   * mobile connection is already a long wait for decoration, and the hero shows
   * its poster until the video is ready in any case.
   *
   * MOV is absent deliberately. iPhones record it, mostly in HEVC, which Chrome
   * on Android will not decode; accepting it would mean uploads that look right
   * to the person who made them and play for nobody else. Refusing it at the
   * door is kinder than a silent black rectangle on the invitation.
   */
  video: {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ["video/mp4", "video/webm"],
    extensions: [".mp4", ".webm"],
  },
};
