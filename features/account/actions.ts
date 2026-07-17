"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { routes } from "@/lib/config";
import {
  uploadFile,
  publicUrl,
  BUCKETS,
  avatarPath,
} from "@/services/upload/storage";
import { extensionOf } from "@/services/upload";
import type { ActionState } from "@/features/auth/actions";
import { profileSchema, preferencesSchema } from "./schema";

/**
 * Account Server Actions — Ph1.md §5.
 *
 * Every action derives the user from the session and never from the form. A
 * hidden userId field would be an invitation to edit somebody else's profile by
 * changing one value in devtools.
 */

const UNAUTHENTICATED: ActionState = { error: "Please sign in again." };

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return UNAUTHENTICATED;

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: { displayName: parsed.data.displayName },
    });
  } catch (error) {
    logger.report(error, { at: "updateProfile", userId: user.id });
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath(routes.dashboard.account);
  revalidatePath("/", "layout"); // The nav shows the name too.
  return { message: "Profile updated." };
}

export async function updatePreferences(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return UNAUTHENTICATED;

  const parsed = preferencesSchema.safeParse({
    theme: formData.get("theme"),
    // An unchecked checkbox sends nothing at all — absence means false.
    emailNotifications: formData.get("emailNotifications") !== null,
    marketingEmails: formData.get("marketingEmails") !== null,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    await prisma.preference.upsert({
      where: { profileId: user.id },
      update: parsed.data,
      create: { profileId: user.id, ...parsed.data },
    });
  } catch (error) {
    logger.report(error, { at: "updatePreferences", userId: user.id });
    return { error: "Could not save your preferences. Please try again." };
  }

  revalidatePath(routes.dashboard.account);
  return { message: "Preferences saved." };
}

export async function updateAvatar(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return UNAUTHENTICATED;

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  // Path is derived from the session's user id, so a caller cannot write to
  // another user's prefix no matter what they put in the form.
  const path = avatarPath(user.id, extensionOf(file.name));

  const result = await uploadFile({
    bucket: BUCKETS.avatars,
    path,
    file,
    kind: "image",
    upsert: true, // One avatar per user; replacing is the whole point.
  });

  if ("code" in result) {
    return { error: result.message };
  }

  const url = publicUrl(BUCKETS.avatars, result.path);
  if (!url) {
    return {
      error: "Upload succeeded but the image URL could not be resolved.",
    };
  }

  try {
    await prisma.profile.update({
      where: { id: user.id },
      // Cache-bust: the path is stable across replacements, so without this the
      // old avatar stays on screen until the CDN entry expires.
      data: { avatarUrl: `${url}?v=${Date.now()}` },
    });
  } catch (error) {
    logger.report(error, { at: "updateAvatar", userId: user.id });
    return { error: "Could not save your picture. Please try again." };
  }

  revalidatePath(routes.dashboard.account);
  revalidatePath("/", "layout");
  return { message: "Picture updated." };
}
