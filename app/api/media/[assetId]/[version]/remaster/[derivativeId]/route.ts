import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import {
  getAsset,
  getPublicAsset,
  getDerivative,
  isDerivativePublic,
} from "@/services/media";
import { signedReadUrl } from "@/services/upload/signed-read";
import { features } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: { assetId: string; version: string; derivativeId: string } },
) {
  const publicAsset =
    features.websiteGenerator && (await isDerivativePublic(params.derivativeId))
      ? await getPublicAsset(params.assetId)
      : null;
  const profile = await getProfile();
  const asset = profile
    ? ((await getAsset(profile.id, params.assetId)) ?? publicAsset)
    : publicAsset;
  if (!asset || Number.parseInt(params.version, 10) !== asset.version)
    return new Response("Not found", { status: 404 });

  const derivative = await getDerivative(params.derivativeId);
  if (
    !derivative ||
    derivative.assetId !== asset.id ||
    derivative.sourceVersion !== asset.version ||
    derivative.kind !== "REMASTER"
  )
    return new Response("Not found", { status: 404 });

  const url = await signedReadUrl(
    asset.bucket as "media" | "avatars",
    derivative.storagePath,
    60,
  );
  if (!url) return new Response("Not found", { status: 404 });
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body)
    return new Response("Not found", { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": derivative.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
