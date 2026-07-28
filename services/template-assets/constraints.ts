/**
 * What counts as an acceptable template design — Instructions 4, "Validate".
 *
 * No `server-only` and no imports with side effects, deliberately: the upload
 * form renders these limits to the admin and the Server Action enforces them,
 * and the two drifting apart is exactly how someone gets to pick a file that is
 * accepted on screen and refused on submit.
 */

/** 10 MB. A designed cover is a compressed raster, not a print master. */
export const MAX_TEMPLATE_ASSET_BYTES = 10 * 1024 * 1024;

/**
 * Raster only, and deliberately no SVG.
 *
 * services/upload/constraints.ts bans SVG platform-wide because an SVG is a
 * document that can carry script, and serving a user-uploaded one from our own
 * origin is stored XSS against every visitor. That reasoning does not weaken
 * because the uploader is an administrator — the victim is still the visitor,
 * and an admin account is precisely what an attacker would phish for.
 */
export const TEMPLATE_ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const TEMPLATE_ASSET_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/** The `accept` attribute for the upload input. */
export const TEMPLATE_ASSET_ACCEPT = TEMPLATE_ASSET_EXTENSIONS.join(",");

/**
 * Every way this feature can fail, as data.
 *
 * A discriminated union rather than thrown errors: the brief requires
 * user-friendly messages for six named failures, and a union makes it a type
 * error to add a seventh without giving it wording.
 */
export type TemplateAssetFailure =
  | { code: "not-configured"; message: string }
  | { code: "empty"; message: string }
  | { code: "too-large"; message: string }
  | { code: "wrong-type"; message: string }
  | { code: "unreadable-image"; message: string }
  | { code: "storage-error"; message: string }
  | { code: "not-found"; message: string }
  | { code: "database-error"; message: string };

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateTemplateAsset(file: {
  name: string;
  size: number;
  type: string;
}): TemplateAssetFailure | null {
  if (file.size <= 0) {
    return { code: "empty", message: "That file is empty." };
  }

  // Size before type on purpose: telling someone their 900 MB video is "the
  // wrong type" is true and useless — the size is what they have to fix.
  if (file.size > MAX_TEMPLATE_ASSET_BYTES) {
    return {
      code: "too-large",
      message: `That design is ${formatMb(file.size)}. The limit is ${formatMb(MAX_TEMPLATE_ASSET_BYTES)}.`,
    };
  }

  // Both the claimed type and the extension must pass, matching
  // services/upload/validation.ts: a forged header defeats one, a rename
  // defeats the other, and requiring both costs nothing.
  const mimeOk = (TEMPLATE_ASSET_MIME_TYPES as readonly string[]).includes(
    file.type.toLowerCase(),
  );
  const extensionOk = (TEMPLATE_ASSET_EXTENSIONS as readonly string[]).includes(
    extensionOf(file.name),
  );

  if (!mimeOk || !extensionOk) {
    return {
      code: "wrong-type",
      message: `Only ${TEMPLATE_ASSET_EXTENSIONS.join(", ")} designs are accepted.`,
    };
  }

  return null;
}
