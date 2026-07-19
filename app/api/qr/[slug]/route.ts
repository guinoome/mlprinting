import { type NextRequest } from "next/server";
import { getPublishedInvitation } from "@/features/website-generator/repository";
import { generateQrPng } from "@/lib/qr";
import { routes } from "@/lib/config";
import { env } from "@/lib/env";

/**
 * QR code for a published site — Ph5.md §5. A pure function of the slug's
 * public URL, the same "deterministic image, cacheable" shape as
 * app/api/placeholder/[surface]/[seed]/route.ts, but gated on the invitation
 * actually being published: an unpublished slug gets no QR code, matching
 * every other guest-facing surface this phase adds. No session required —
 * the image encodes a URL that is itself public once published, nothing
 * about the QR code reveals anything a guest couldn't already reach.
 */
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const invitation = await getPublishedInvitation(params.slug);
  if (!invitation) return new Response("Not found", { status: 404 });

  const url = `${env.app.url}${routes.publicEvent(params.slug)}`;
  const png = await generateQrPng(url);

  // `Response` (per lib.dom's `BodyInit`) doesn't structurally accept the
  // `Buffer` type as @types/node ^20.19 now shapes it, only `Uint8Array` and
  // friends — the same runtime bytes, wrapped so `tsc` accepts them.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Immutable is safe: the slug is stable once published (design doc
      // Decision 1), so the encoded URL never changes without a new slug.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
