import "server-only";

import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/env";
import type { Bucket } from "./storage";

/**
 * A short-lived signed URL for an object the caller has *already* been
 * authorised to read.
 *
 * Signed with the service role, and the distinction from `signedUrl` in
 * storage.ts matters. That one signs as the signed-in user, which is correct
 * when the user is the authorisation. These three callers are not that:
 *
 *  - the media proxy serves a guest viewing a *published* invitation. There is
 *    no session, so signing as the caller means signing as `anon`, which under
 *    real RLS can only work if the bucket is opened to anonymous reads — which
 *    would hand every customer's private photographs to anyone with the anon
 *    key. The route has already decided the object is publicly visible.
 *  - PDF generation runs as a background job with no session at all.
 *  - the PDF download route serves a file after checking the order.
 *
 * In each case authorisation happened first, in code that can see the whole
 * question. This function only fetches bytes that decision already permitted.
 *
 * The URL never reaches a browser. It is minted server-side, used once by our
 * own fetch, and expires in a minute; what the browser receives is our
 * re-served response. So this is not a public link with extra steps.
 *
 * Writes deliberately do NOT go through here. Uploads still run as the
 * signed-in user against an own-folder RLS policy, because that is the path
 * where a bug would put one customer's file in another's folder, and it is
 * exactly where a second line of defence earns its keep.
 */
export async function signedReadUrl(
  bucket: Bucket,
  path: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return null;

  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    logger.report(error, { at: "signedReadUrl", bucket });
    return null;
  }
  return data?.signedUrl ?? null;
}
