"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { updateAssetMeta, deleteAsset } from "@/services/media";
import { routes } from "@/lib/config";

/**
 * Asset metadata and delete — Ph4.md §6 (metadata), §11 (delete protection).
 * Thin: the work is in services/media; this exists only to turn a form post
 * into that call, same shape as
 * features/invitation-builder/media-actions.ts.
 */

export interface MetaFormState {
  error?: string;
}

export async function updateAssetMetaAction(
  _prev: MetaFormState,
  formData: FormData,
): Promise<MetaFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const altText = formData.get("altText")?.toString().trim();
  const tagsRaw = formData.get("tags")?.toString() ?? "";
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  const result = await updateAssetMeta(profile.id, assetId, {
    altText: altText || null,
    tags,
  });
  if (!result) return { error: "That image no longer exists." };

  revalidatePath(routes.dashboard.media);
  return {};
}

export interface DeleteFormState {
  error?: string;
  usedBy?: string[];
}

export async function deleteAssetAction(
  _prev: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const result = await deleteAsset(profile.id, assetId);
  if (!result.ok) return { error: result.error, usedBy: result.usedBy };

  revalidatePath(routes.dashboard.media);
  return {};
}
