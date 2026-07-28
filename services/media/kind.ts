import type { MediaKind } from "@prisma/client";

/**
 * Which kind of asset a file is, from its MIME type.
 *
 * Pure and Prisma-free at runtime — it imports only a type — so the mapping can
 * be asserted without a database.
 *
 * IMAGE is the fallback rather than a thrown error on purpose. Nothing reaches
 * this function without passing validateUpload first, so an unrecognised type
 * here would mean the constraint table and this map disagree, and the honest
 * failure for that is a stored row whose kind is wrong, not a 500 on a file the
 * platform already agreed to accept. The pairing is covered by a test that
 * walks UPLOAD_CONSTRAINTS, so the disagreement is caught before it ships.
 */
export function mediaKindForMime(mimeType: string): MediaKind {
  const mime = mimeType.trim().toLowerCase();
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (mime === "application/pdf") return "DOCUMENT";
  return "IMAGE";
}
