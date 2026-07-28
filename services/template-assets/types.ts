/**
 * Shapes for admin-uploaded template artwork — Instructions 4.
 *
 * Kept free of Prisma imports so client components can hold these without
 * dragging the client bundle into the browser.
 */

export interface TemplateAssetRow {
  id: string;
  name: string;
  bucket: string;
  storagePath: string;
  /** Null when thumbnail generation failed; the list falls back to the original. */
  thumbnailPath: string | null;
  originalFilename: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  uploadedBy: { displayName: string | null; email: string } | null;
  /** Catalogue entries currently wearing this design. */
  templates: { id: string; name: string; slug: string }[];
}

/** A template an admin can point artwork at. */
export interface AssignableTemplate {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string;
  artworkId: string | null;
  category: { name: string };
}

/** Re-exported so consumers have one import for this feature's shapes.
 * Defined in constraints.ts, which the client bundle can also reach. */
export type { TemplateAssetFailure } from "./constraints";
