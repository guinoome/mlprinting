"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { createAsset, deleteAsset } from "@/services/media";
import { routes } from "@/lib/config";
import { validateUpload } from "@/services/upload";

/**
 * Media upload — Ph3.md §7, and the §Success Criteria's "Upload media".
 *
 * Thin: the work is in services/media, which is the seam Ph4's Library takes
 * over. This exists only to turn a form post into that call.
 */

export interface MediaUploadState {
  error?: string;
  assetId?: string;
  usedBy?: string[];
}

export async function uploadMedia(
  _prev: MediaUploadState,
  formData: FormData,
): Promise<MediaUploadState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  // Checked here as well as inside the service. Ph3.md §9 lists "Image
  // Requirements" as validation the customer should hear about in friendly
  // terms, and this is the layer that can say it next to the form.
  const failure = validateUpload(
    { name: file.name, size: file.size, type: file.type },
    "image",
  );
  if (failure) return { error: failure.message };

  const result = await createAsset({
    profileId: profile.id,
    file,
    altText: formData.get("altText")?.toString(),
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(routes.builder, "layout");
  return { assetId: result.assetId };
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
    // Ph4.md §11 — say where it is used rather than just refusing.
    return { error: result.error, usedBy: result.usedBy };
  }

  revalidatePath(routes.builder, "layout");
  return {};
}
