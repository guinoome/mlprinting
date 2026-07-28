/**
 * Naming rules for uploaded template artwork — Instructions 4, "Upload".
 *
 * Pure and storage-free so the rules that matter for safety can be tested
 * without a bucket. Two of them matter a great deal:
 *
 * 1. The brief asks us to handle "duplicate filenames (or generate unique
 *    filenames)". We generate. Reusing the admin's filename means the second
 *    person to upload `cover.png` silently overwrites the first person's
 *    design, and the failure is invisible until a customer sees the wrong
 *    artwork.
 * 2. A filename arrives from outside and is therefore hostile until proven
 *    otherwise. `../../config.json` must not be able to address anything but
 *    the folder we chose.
 */

/** Bucket holding admin-uploaded template artwork. Public-read: this is
 * marketing imagery shown on the catalogue, not customer data. */
export const TEMPLATE_ASSET_BUCKET = "template-assets";

/** Longest slug kept from the original filename. The uuid carries uniqueness,
 * so this exists purely so a human can recognise the object in a bucket
 * listing. */
const MAX_SLUG_LENGTH = 48;

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  // A leading dot is a hidden file, not an extension: ".env" has none.
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

/**
 * The filename without its extension, reduced to a URL-safe slug.
 *
 * Returns "artwork" rather than an empty string when nothing survives, because
 * a path segment of `<uuid>-.png` reads as a bug to whoever finds it later.
 */
export function slugifyFilename(filename: string): string {
  const base = filename.slice(
    0,
    filename.length - extensionOf(filename).length,
  );

  const slug = base
    .toLowerCase()
    // Anything not a letter, digit or separator becomes a break. This is what
    // neutralises `../`, backslashes, control characters and quotes in one
    // rule rather than a blocklist that has to anticipate each of them.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "artwork";
}

/**
 * Where an uploaded design is stored.
 *
 * Foldered by year and month so a bucket listing stays navigable after a few
 * hundred uploads, and prefixed with a uuid so uniqueness never depends on the
 * admin choosing distinct filenames.
 *
 * `id` and `now` are arguments rather than generated here so the function is
 * deterministic and therefore testable — the caller supplies the row's uuid,
 * which also keeps the object path and the database row provably in step.
 */
export function templateAssetPath(
  id: string,
  originalFilename: string,
  now: Date,
): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = extensionOf(originalFilename);
  return `covers/${year}/${month}/${id}-${slugifyFilename(originalFilename)}${extension}`;
}

/** Thumbnail companion to an original. Always WebP — processImage re-encodes. */
export function templateThumbnailPath(objectPath: string): string {
  const dot = objectPath.lastIndexOf(".");
  const base = dot > 0 ? objectPath.slice(0, dot) : objectPath;
  return `${base}-thumb.webp`;
}

/**
 * The display name offered when the admin does not type one.
 *
 * Title-cased from the filename, because "rustic-garden-invite.png" is a name
 * somebody can scan in a list and "rustic-garden-invite.png" is not.
 */
export function defaultDisplayName(originalFilename: string): string {
  const words = slugifyFilename(originalFilename).split("-").filter(Boolean);
  if (words.length === 0) return "Untitled design";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
