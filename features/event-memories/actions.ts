"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import {
  createGuestMemory,
  findOwnerMemoryContext,
  upsertMemorySettings,
  moderateMemorySubmission,
} from "@/services/memories";
import { scheduleLifecycleNotifications } from "@/services/lifecycle-notifications";
import {
  enforcePublicRateLimit,
  requestAddress,
} from "@/services/security/rate-limit";

export interface MemoryUploadState {
  error?: string;
  success?: boolean;
}

export async function submitGuestMemory(
  _previous: MemoryUploadState,
  formData: FormData,
): Promise<MemoryUploadState> {
  const slug = String(formData.get("slug") ?? "");
  const rate = await enforcePublicRateLimit({
    scope: `memory:${slug}`,
    address: requestAddress(headers()),
    limit: 6,
    windowMs: 10 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      error:
        "Too many uploads from this connection. Please wait and try again.",
    };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a photo or video." };
  const result = await createGuestMemory({
    slug,
    file,
    guestName: String(formData.get("guestName") ?? ""),
    caption: String(formData.get("caption") ?? ""),
  });
  return result.ok ? { success: true } : { error: result.error };
}

export async function moderateMemory(formData: FormData) {
  const profile = await getProfile();
  if (!profile) return;
  const id = String(formData.get("id") ?? "");
  const invitationId = String(formData.get("invitationId") ?? "");
  const status = formData.get("status");
  if (status !== "APPROVED" && status !== "REJECTED") return;
  if (await moderateMemorySubmission(profile.id, id, status))
    revalidatePath(routes.dashboard.eventMemories(invitationId));
}

const dateField = z.preprocess(
  (value) => (value === null ? null : value),
  z.coerce.date().nullable(),
);

const settingsSchema = z
  .object({
    invitationId: z.string().uuid(),
    enabled: z.boolean(),
    mode: z.enum([
      "PRIVATE_COLLECTION",
      "GUEST_GALLERY",
      "LIVE_WALL",
      "POST_EVENT_ARCHIVE",
    ]),
    opensAt: dateField,
    closesAt: dateField,
    allowVideos: z.boolean(),
  })
  .refine(
    (data) => !data.opensAt || !data.closesAt || data.opensAt <= data.closesAt,
    {
      message: "The closing time must be after the opening time.",
    },
  );

export async function saveMemorySettings(formData: FormData) {
  const profile = await getProfile();
  if (!profile) return;
  const invitationId = String(formData.get("invitationId") ?? "");
  const owned = await findOwnerMemoryContext(profile.id, invitationId);
  if (!owned) return;
  const date = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value ? value : null;
  };
  const parsed = settingsSchema.safeParse({
    invitationId,
    enabled: formData.get("enabled") === "on",
    mode: formData.get("mode"),
    opensAt: date("opensAt"),
    closesAt: date("closesAt"),
    allowVideos: formData.get("allowVideos") === "on",
  });
  if (!parsed.success) return;
  const { enabled, mode, opensAt, closesAt, allowVideos } = parsed.data;
  await upsertMemorySettings(invitationId, {
    enabled,
    mode,
    opensAt,
    closesAt,
    allowVideos,
  });
  await scheduleLifecycleNotifications(invitationId);
  revalidatePath(routes.dashboard.eventMemories(invitationId));
  if (owned.slug) revalidatePath(routes.publicEventMemories(owned.slug));
}
