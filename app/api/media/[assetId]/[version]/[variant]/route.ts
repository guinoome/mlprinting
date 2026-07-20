import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import {
  getAsset,
  getPublicAsset,
  hasVariants,
  assetObjectPath,
} from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";
import { features } from "@/lib/config";

/**
 * Dual-path media serving — design doc Decision 4. Mirrors
 * app/api/placeholder/[surface]/[seed]/route.ts's shape. Serves media via two
 * authorization paths: (1) owned-by-authenticated-session (dashboard, library,
 * builder preview), or (2) publicly-visible-via-published-invitation (guests
 * viewing the live site). No single authorization check applies to all paths.
 *
 * Never Edge: this calls services/upload/storage.ts, which reaches Supabase
 * via lib/supabase/server.ts's cookie-based client — a Node API.
 */
export const runtime = "nodejs";

type Variant = "original" | "thumbnail" | "preview";
const VALID_VARIANTS: readonly Variant[] = ["original", "thumbnail", "preview"];

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: { assetId: string; version: string; variant: string } },
) {
  if (!(VALID_VARIANTS as readonly string[]).includes(params.variant)) {
    return new Response("Unknown variant", { status: 404 });
  }
  const variant = params.variant as Variant;

  // Two ways in: the caller owns this asset (dashboard, media library, the
  // builder's own preview), or it's used by a currently published invitation
  // (a guest viewing the live site — design doc Decision 4). Neither check
  // reveals which reason failed; both dead ends return the same 404.
  // The public path exists only to serve photos on a published event website,
  // so it is gated on the same flag that gates the website. The owned path is
  // deliberately not: the dashboard, media library and builder preview all
  // need a customer's own images whether or not the website generator is on.
  const publicAsset = features.websiteGenerator
    ? await getPublicAsset(params.assetId)
    : null;

  const profile = await getProfile();
  const asset = profile
    ? ((await getAsset(profile.id, params.assetId)) ?? publicAsset)
    : publicAsset;

  if (!asset) return new Response("Not found", { status: 404 });

  const requestedVersion = Number.parseInt(params.version, 10);
  if (requestedVersion !== asset.version) {
    // A stale or bookmarked URL from a replaced version — those objects were
    // deleted once the replacement was confirmed written (design doc's
    // replace-ordering guarantee). Every current page constructs this URL
    // from the row's current version, so this path is never hit by normal
    // navigation.
    return new Response("Not found", { status: 404 });
  }

  if (variant !== "original" && !hasVariants(asset)) {
    // The design's fallback rule is the caller's job (see thumbnailUrl /
    // previewUrl in services/media/index.ts) — a request that skips that and
    // asks for a variant that was never generated gets a plain 404, not a
    // silent substitution.
    return new Response("Not found", { status: 404 });
  }

  const path = assetObjectPath(
    asset.profileId,
    asset.id,
    asset.version,
    variant,
    extensionOf(asset.originalFilename),
  );

  // Short-lived on purpose: this URL is used once, immediately, server-side,
  // and never reaches the browser — only our own re-served bytes do.
  const url = await signedUrl(asset.bucket as "media" | "avatars", path, 60);
  if (!url) return new Response("Not found", { status: 404 });

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = variant === "original" ? asset.mimeType : "image/webp";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      // Version is embedded in the URL path, so this specific triple's bytes
      // never change — safe to cache forever, per-user. Use `private` (not
      // `public`) because an asset could later be unpublished: CDN caching
      // to a shared cache would be wrong even if currently public.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
