import { getProfile } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/is-staff";
import { getPaymentProofForViewer } from "@/services/commerce";
import { signedReadUrl } from "@/services/upload/signed-read";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { proofId: string } },
) {
  const profile = await getProfile();
  if (!profile) return new Response("Not found", { status: 404 });
  const proof = await getPaymentProofForViewer({
    proofId: params.proofId,
    viewerId: profile.id,
    staff: isStaff(profile),
  });
  if (!proof || proof.bucket !== "media") {
    return new Response("Not found", { status: 404 });
  }
  const url = await signedReadUrl("media", proof.storagePath, 60);
  if (!url) return new Response("Not found", { status: 404 });
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
  const filename = encodeURIComponent(proof.originalFilename);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": proof.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
