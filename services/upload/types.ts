/**
 * Upload framework types — Ph1.md §8.
 *
 * Phase 1 prepares the seam; Ph4's Media Library is the first real consumer.
 * Deliberately no concept of an "asset" here: Ph4.md makes the Media Library
 * the sole owner of assets, and a service that invents its own asset record
 * would put a second owner in the system on day one.
 */

/** What a caller is uploading. Constraints differ per kind. */
export type UploadKind = "image" | "document";

export interface UploadConstraints {
  maxBytes: number;
  /** Allowed MIME types. */
  mimeTypes: readonly string[];
  /** Allowed extensions, lowercase, with the dot. */
  extensions: readonly string[];
}

export interface UploadResult {
  /** Storage path, not a URL. URLs expire; paths do not. */
  path: string;
  bytes: number;
  contentType: string;
}

export type UploadFailure =
  | { code: "too-large"; message: string }
  | { code: "wrong-type"; message: string }
  | { code: "empty"; message: string }
  | { code: "not-configured"; message: string }
  | { code: "storage-error"; message: string };
