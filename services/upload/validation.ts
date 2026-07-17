import { UPLOAD_CONSTRAINTS } from "./constraints";
import type { UploadKind, UploadFailure } from "./types";
import { formatBytes } from "@/lib/utils";

/**
 * Upload validation — Ph1.md §8.
 *
 * Pure and dependency-free so it runs identically in the browser (fast
 * feedback) and on the server (the check that counts). The browser copy is a
 * courtesy: a `Content-Type` header is written by the client, and a request can
 * arrive without ever touching our form.
 *
 * This is a gate, not a scanner. It proves a file claims a permitted type and
 * fits a size budget. It does not prove the bytes are what they claim to be —
 * content sniffing belongs with Ph4's Media Library, where uploads are actually
 * stored and served.
 */

export interface FileDescriptor {
  name: string;
  size: number;
  type: string;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  // A leading dot is a hidden file, not an extension: ".env" has none.
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

export function validateUpload(
  file: FileDescriptor,
  kind: UploadKind,
): UploadFailure | null {
  const { maxBytes, mimeTypes, extensions } = UPLOAD_CONSTRAINTS[kind];

  if (file.size <= 0) {
    return { code: "empty", message: "That file is empty." };
  }

  if (file.size > maxBytes) {
    return {
      code: "too-large",
      message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`,
    };
  }

  // Both the claimed MIME type and the extension must be permitted. Checking
  // only the MIME type lets "invoice.exe" through with a forged header;
  // checking only the extension lets a renamed file through. Neither check is
  // strong, and requiring both costs nothing.
  const mimeOk = mimeTypes.includes(file.type.toLowerCase());
  const extensionOk = extensions.includes(extensionOf(file.name));

  if (!mimeOk || !extensionOk) {
    return {
      code: "wrong-type",
      message: `That file type is not accepted. Allowed: ${extensions.join(", ")}.`,
    };
  }

  return null;
}

/** The `accept` attribute for a file input of this kind. */
export function acceptAttribute(kind: UploadKind): string {
  return UPLOAD_CONSTRAINTS[kind].extensions.join(",");
}
