import { getProfile } from "@/lib/auth/session";
import {
  getInvitationForManage,
  listRsvps,
} from "@/features/website-generator/repository";
import { rsvpCsv } from "@/features/website-generator/rsvp-intelligence";
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const profile = await getProfile();
  if (!profile) return new Response("Not found", { status: 404 });
  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) return new Response("Not found", { status: 404 });
  const rows = await listRsvps(profile.id, params.id);
  const filename = `rsvps-${
    invitation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event"
  }.csv`;
  return new Response(`\uFEFF${rsvpCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
