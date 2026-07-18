"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { deleteAsset } from "@/services/media";
import { routes } from "@/lib/config";

/**
 * Delete an assigned photo — Ph3.md §7. Upload is no longer here: it goes
 * through the shared UploadDropzone / app/api/media/upload/route.ts, the same
 * path the Media Library itself uses (services/media/index.ts's createAsset).
 */

export interface MediaUploadState {
  error?: string;
  usedBy?: string[];
}

export async function removeMedia(
  _prev: MediaUploadState,
  formData: FormData,
): Promise<MediaUploadState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const result = await deleteAsset(profile.id, assetId);

  if (!result.ok) {
    return { error: result.error, usedBy: result.usedBy };
  }

  revalidatePath(routes.builder, "layout");
  return {};
}
