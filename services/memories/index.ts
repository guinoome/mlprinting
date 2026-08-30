import "server-only";
import {
  extensionOf,
  uploadKindForMime,
  validateUpload,
} from "@/services/upload";
import { BUCKETS } from "@/services/upload/storage";
import { logger } from "@/lib/logger";
import { memoryWindowState } from "./policy";
import { findPublicMemoryContext, insertMemorySubmission } from "./repository";
import { removeGuestMemory, storeGuestMemory } from "./storage";
import { uploadSignatureMatches } from "@/services/upload/signature";

export {
  findOwnerMemoryContext,
  upsertMemorySettings,
  listOwnerMemorySubmissions,
  listPublicApprovedMemories,
  moderateMemorySubmission,
  findMemoryForRead,
} from "./repository";
export { findPublicMemoryContext } from "./repository";
export { memoryWindowState, approvedContentMayBePublic } from "./policy";

export type CreateGuestMemoryResult =
  { ok: true } | { ok: false; error: string };

export async function createGuestMemory(input: {
  slug: string;
  file: File;
  guestName?: string;
  caption?: string;
}): Promise<CreateGuestMemoryResult> {
  const context = await findPublicMemoryContext(input.slug);
  const settings = context?.memorySettings;
  if (!context || !settings)
    return { ok: false, error: "Memory sharing is not available." };
  if (memoryWindowState(settings) !== "open")
    return { ok: false, error: "Memory sharing is not open right now." };

  const kind = uploadKindForMime(input.file.type);
  if (!kind || (kind !== "image" && kind !== "video"))
    return { ok: false, error: "Choose a supported photo or video." };
  if (kind === "video" && !settings.allowVideos)
    return { ok: false, error: "This event accepts photos only." };
  const invalid = validateUpload(input.file, kind);
  if (invalid) return { ok: false, error: invalid.message };
  if (!(await uploadSignatureMatches(input.file, kind)))
    return {
      ok: false,
      error: "The file contents do not match the selected file type.",
    };

  const id = crypto.randomUUID();
  const path = `${context.profileId}/${context.id}/memories/${id}${extensionOf(input.file.name)}`;
  if (!(await storeGuestMemory(path, input.file)))
    return { ok: false, error: "Could not upload that memory. Try again." };

  try {
    await insertMemorySubmission({
      id,
      invitationId: context.id,
      guestName: input.guestName?.trim().slice(0, 120) || null,
      caption: input.caption?.trim().slice(0, 500) || null,
      bucket: BUCKETS.media,
      storagePath: path,
      mimeType: input.file.type,
      bytes: input.file.size,
      originalFilename: input.file.name.slice(0, 200),
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "createGuestMemory", invitationId: context.id });
    await removeGuestMemory(path);
    return { ok: false, error: "Could not save that memory. Try again." };
  }
}
