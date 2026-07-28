"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { revalidateCatalog } from "@/features/template-marketplace/repository";
import { routes } from "@/lib/config";
import type { ActionState } from "@/lib/forms/action-state";
import {
  assignArtwork,
  deleteTemplateAsset,
  unassignArtwork,
  uploadTemplateAsset,
} from "@/services/template-assets";

/**
 * Admin template artwork actions — Instructions 4.
 *
 * Every one of these calls requireStaff first, and none of them takes an
 * identity from the form. A Server Action is reachable by POST regardless of
 * what was rendered, so guarding the page that links here would protect
 * nothing: the brief's "Non-admin users must not access this module" has to be
 * enforced at each entry point or it is not enforced at all.
 *
 * requireStaff 404s rather than redirecting, which is deliberate — see
 * lib/auth/require-staff.ts. A redirect to sign-in would confirm to a stranger
 * that this module exists.
 */

/** Every surface that renders a template cover, so a new design shows at once. */
function revalidateCatalogue(): void {
  revalidatePath(routes.admin.templates);
  revalidatePath(routes.templates);
  revalidatePath("/");
  // The marketplace caches its catalogue queries behind this tag, and its own
  // comment names this feature as the reason it exists.
  revalidateCatalog();
}

export async function uploadTemplateArtwork(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: "Choose a design to upload." } };
  }

  const result = await uploadTemplateAsset({
    file,
    name: String(formData.get("name") ?? ""),
    uploadedById: profile.id,
  });

  if (!result.ok) {
    // Size and type are the admin's file, so they belong on the input. The
    // rest are ours and belong at the top of the form.
    const onField =
      result.failure.code === "too-large" ||
      result.failure.code === "wrong-type" ||
      result.failure.code === "empty" ||
      result.failure.code === "unreadable-image";

    return onField
      ? { fieldErrors: { file: result.failure.message } }
      : { error: result.failure.message };
  }

  revalidateCatalogue();
  return { message: `“${result.asset.name}” uploaded.` };
}

export async function removeTemplateArtwork(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const id = String(formData.get("assetId") ?? "");
  if (!id) return { error: "That design could not be identified." };

  const result = await deleteTemplateAsset(id);
  if (!result.ok) return { error: result.failure.message };

  revalidateCatalogue();
  return { message: "Design deleted." };
}

export async function applyTemplateArtwork(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const assetId = String(formData.get("assetId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!assetId || !templateId) {
    return { error: "Pick a template to apply this design to." };
  }

  const result = await assignArtwork(templateId, assetId);
  if (!result.ok) return { error: result.failure.message };

  revalidateCatalogue();
  return { message: "Design applied to the template." };
}

export async function restoreGeneratedCover(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const templateId = String(formData.get("templateId") ?? "");
  if (!templateId) return { error: "That template could not be identified." };

  const result = await unassignArtwork(templateId);
  if (!result.ok) return { error: result.failure.message };

  revalidateCatalogue();
  return { message: "Original cover restored." };
}
