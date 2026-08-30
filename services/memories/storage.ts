import "server-only";
import {
  createAdminClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { BUCKETS } from "@/services/upload/storage";
export async function storeGuestMemory(path: string, file: File) {
  if (!isServiceRoleConfigured()) return false;
  const { error } = await createAdminClient()
    .storage.from(BUCKETS.media)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });
  return !error;
}
export async function removeGuestMemory(path: string) {
  if (!isServiceRoleConfigured()) return;
  await createAdminClient().storage.from(BUCKETS.media).remove([path]);
}
