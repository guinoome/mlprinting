import "server-only";

import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { TEMPLATE_ASSET_BUCKET } from "./naming";

/**
 * Storage for admin-uploaded template artwork — Instructions 4.
 *
 * Its own module rather than an extra branch inside services/upload/storage.ts.
 * That service is built around a request-scoped, user-authenticated client, and
 * teaching it to sometimes use a service-role one would mean every existing
 * caller now sits one wrong argument away from bypassing RLS. Keeping the
 * privileged path separate makes it greppable.
 */

export function isTemplateStorageConfigured(): boolean {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

export type PutResult = { ok: true } | { ok: false; message: string };

export async function putObject(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<PutResult> {
  if (!isTemplateStorageConfigured()) {
    return { ok: false, message: "File storage is not configured on this deployment." };
  }

  const { error } = await createAdminClient()
    .storage.from(TEMPLATE_ASSET_BUCKET)
    .upload(path, body, {
      contentType,
      // Never overwrite. Paths carry a uuid, so a collision means a bug, and
      // silently replacing somebody's artwork is the worst way to find out.
      upsert: false,
      /**
       * One hour, matching services/upload/storage.ts.
       *
       * The path is immutable — a uuid that is never reused — so a year would
       * be safe for *correctness* and better for cost. It is wrong for
       * deletion: the CDN keeps serving an object after it is removed from the
       * bucket, so a long cache means a design an admin deleted stays publicly
       * fetchable for that whole window. Measured, not assumed — a delete left
       * the bucket empty at every prefix while the public URL still returned
       * 200. An hour bounds that to something defensible.
       */
      cacheControl: "3600",
    });

  if (error) {
    logger.report(error, { at: "templateAssets.putObject", path });
    return { ok: false, message: "Upload failed. Please try again." };
  }
  return { ok: true };
}

/** Best effort. A leftover object costs kilobytes; a failed delete must not
 * surface as the operation's own error. */
export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0 || !isTemplateStorageConfigured()) return;

  const { error } = await createAdminClient()
    .storage.from(TEMPLATE_ASSET_BUCKET)
    .remove(paths);

  if (error) logger.report(error, { at: "templateAssets.removeObjects" });
}

/**
 * Public URL for a stored object.
 *
 * Built by hand rather than through the SDK so it needs no client and stays a
 * pure function of the path — the admin grid renders dozens of these per page,
 * and the shape is a documented, stable Supabase route.
 */
export function objectPublicUrl(path: string | null): string | null {
  if (!path || !isSupabaseConfigured()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${TEMPLATE_ASSET_BUCKET}/${path}`;
}
