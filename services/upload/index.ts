/**
 * Upload service — Ph1.md §8.
 *
 * Client-safe surface (validation, constraints, types) and the server-only
 * storage functions are both re-exported here, but `storage.ts` carries a
 * `server-only` import, so a Client Component that reaches for uploadFile gets
 * a build error rather than a bundled Supabase service call.
 */

export { UPLOAD_CONSTRAINTS } from "./constraints";
export { validateUpload, acceptAttribute, extensionOf } from "./validation";
export type { FileDescriptor } from "./validation";
export type {
  UploadKind,
  UploadConstraints,
  UploadResult,
  UploadFailure,
} from "./types";
