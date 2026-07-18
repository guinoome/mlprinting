import "server-only";

import { uploadFile, removeFile, BUCKETS } from "@/services/upload/storage";
import type { MediaVariant } from "./types";

/**
 * Multi-object storage writes for one asset's original + generated variants —
 * design doc's processing pipeline step 4 ("Write original + both derivatives
 * to storage"). Built on services/upload/storage.ts rather than reaching for
 * Supabase directly, per Ph1.md §8 ("future modules will reuse this service").
 */

export interface AssetObjectWrite {
  variant: MediaVariant;
  path: string;
  buffer: Buffer;
  contentType: string;
}

export type WriteAssetObjectsResult =
  | { ok: true }
  | { ok: false; error: string; written: string[] };

/**
 * Writes each object in order, stopping at the first failure. Returns which
 * paths landed even on failure, so a caller can clean up exactly those objects
 * rather than guess — the orphan-prevention pattern createAsset already used
 * in Phase 3, extended here from one object to up to three.
 */
export async function writeAssetObjects(
  writes: AssetObjectWrite[],
): Promise<WriteAssetObjectsResult> {
  const written: string[] = [];

  for (const write of writes) {
    const filename = write.path.split("/").pop() ?? "asset";
    const file = new File([new Uint8Array(write.buffer)], filename, {
      type: write.contentType,
    });

    const result = await uploadFile({
      bucket: BUCKETS.media,
      path: write.path,
      file,
      kind: "image",
      upsert: true,
    });

    if ("code" in result) {
      return { ok: false, error: result.message, written };
    }
    written.push(write.path);
  }

  return { ok: true };
}

/**
 * Best-effort cleanup. An orphaned file costs a few kilobytes and no user ever
 * sees it — removeFile already logs its own failures, so a failed cleanup must
 * never surface as this operation's own error.
 */
export async function removeAssetObjects(paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => removeFile(BUCKETS.media, path)));
}
