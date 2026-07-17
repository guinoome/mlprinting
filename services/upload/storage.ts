import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { validateUpload } from "./validation";
import type { UploadKind, UploadResult, UploadFailure } from "./types";

/**
 * Storage service — Ph1.md §8 ("Future modules will reuse this service").
 *
 * A thin, typed seam over Supabase Storage. Ph4's Media Library will call this
 * rather than reach for a Supabase client itself, so the day storage moves the
 * change lands in one file (Ph4.md §15: features depend on services, never the
 * reverse).
 *
 * Returns failures rather than throwing. An upload rejected for being 12 MB is
 * an expected outcome that a form must render, not an exception.
 */

export const BUCKETS = {
  /** Per-user avatars. Public-read. */
  avatars: "avatars",
  /** Customer media. Private; served through signed URLs. */
  media: "media",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export interface UploadOptions {
  bucket: Bucket;
  /**
   * Path within the bucket. Callers must scope it by owner — "<userId>/<name>" —
   * because that prefix is what storage access policies match on.
   */
  path: string;
  file: File;
  kind: UploadKind;
  /** Replace an existing object at this path rather than failing. */
  upsert?: boolean;
}

export async function uploadFile({
  bucket,
  path,
  file,
  kind,
  upsert = false,
}: UploadOptions): Promise<UploadResult | UploadFailure> {
  if (!isSupabaseConfigured()) {
    return {
      code: "not-configured",
      message: "File storage is not configured on this deployment.",
    };
  }

  // Re-validate here even though the client already did. This function is the
  // last gate before bytes land in a bucket, and it is reachable from any
  // Server Action a later phase writes — including ones whose forms forget.
  const failure = validateUpload(
    { name: file.name, size: file.size, type: file.type },
    kind,
  );
  if (failure) return failure;

  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    // Pin what we serve it back as. Without this Supabase echoes the client's
    // Content-Type, letting an uploader choose the header a browser will later
    // obey when rendering their file from our origin.
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    logger.report(error, { at: "uploadFile", bucket, kind });
    return {
      code: "storage-error",
      message: "Upload failed. Please try again.",
    };
  }

  return { path, bytes: file.size, contentType: file.type };
}

export async function removeFile(
  bucket: Bucket,
  path: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    logger.report(error, { at: "removeFile", bucket });
    return false;
  }
  return true;
}

/** Public URL for an object in a public bucket. */
export function publicUrl(bucket: Bucket, path: string): string | null {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  return (
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? null
  );
}

/**
 * Time-limited URL for an object in a private bucket.
 * Private media must never be handed out as a permanent link — a signed URL
 * that never expires is a public one with extra characters.
 */
export async function signedUrl(
  bucket: Bucket,
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    logger.report(error, { at: "signedUrl", bucket });
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Test seam: the object path for a user's avatar. */
export function avatarPath(userId: string, extension: string): string {
  return `${userId}/avatar${extension}`;
}
