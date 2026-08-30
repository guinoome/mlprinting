import { getProfile } from "@/lib/auth/session";
import {
  approvedContentMayBePublic,
  findMemoryForRead,
} from "@/services/memories";
import { signedReadUrl } from "@/services/upload/signed-read";
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const memory = await findMemoryForRead(params.id);
  if (!memory) return new Response("Not found", { status: 404 });
  const profile = await getProfile();
  const owner = profile?.id === memory.invitation.profileId;
  const settings = memory.invitation.memorySettings;
  const publiclyApproved =
    memory.status === "APPROVED" &&
    memory.invitation.isPublished &&
    Boolean(settings?.enabled) &&
    approvedContentMayBePublic(settings?.mode ?? "");
  if (!owner && !publiclyApproved)
    return new Response("Not found", { status: 404 });
  const url = await signedReadUrl(
    memory.bucket as "media" | "avatars",
    memory.storagePath,
    60,
  );
  if (!url) return new Response("Not found", { status: 404 });
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body)
    return new Response("Not found", { status: 404 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": memory.mimeType,
      "Cache-Control": publiclyApproved
        ? "private, max-age=60"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
