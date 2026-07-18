/**
 * Shared types for the Media Library — split out so processing.ts, storage.ts,
 * repository.ts, and index.ts can all reference the same shapes without a
 * circular import back through index.ts.
 */

export type MediaVariant = "original" | "thumbnail" | "preview";

export type MediaKindValue = "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

/** The subset of MediaAsset columns every service function reads or returns. */
export interface AssetRow {
  id: string;
  profileId: string;
  bucket: string;
  storagePath: string;
  kind: MediaKindValue;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  altText: string | null;
  tags: string[];
  version: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface AssetUsage {
  assetId: string;
  invitationId: string;
  invitationTitle: string;
  slot: string;
}
