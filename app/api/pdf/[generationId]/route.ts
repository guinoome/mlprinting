import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { getGenerationForOwner, readPdf } from "@/services/pdf";

/**
 * Authenticated download — Ph6.md §11.
 *
 * A single authorization path, unlike the media proxy's two: a print file has
 * no public audience. Guests see the website; the press-ready file, with the
 * customer's photos at full resolution, belongs to its owner alone. Every dead
 * end returns the same 404, so the route never reveals which one it was.
 *
 * Never Edge: reaches Supabase through the cookie-based server client.
 */
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { generationId: string } },
) {
  const profile = await getProfile();
  if (!profile) return new Response("Not found", { status: 404 });

  const generation = await getGenerationForOwner(
    profile.id,
    params.generationId,
  );
  if (!generation || generation.status !== "READY" || !generation.storagePath) {
    return new Response("Not found", { status: 404 });
  }

  const body = await readPdf(generation.storagePath);
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      // attachment, not inline: this is a file to hand a printer, and a name
      // the customer recognises beats a uuid in their downloads folder.
      "Content-Disposition": `attachment; filename="invitation-v${generation.version}.pdf"`,
      // Rows are append-only and the object is never rewritten, so these bytes
      // are immutable. `private` because the file belongs to one customer and
      // must never sit in a shared cache.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
