import { type NextRequest } from "next/server";
import {
  placeholderCover,
  isPlaceholderSurface,
  PLACEHOLDER_SIZES,
} from "@/lib/placeholder-art";

/**
 * Serves generated placeholder artwork — see lib/placeholder-art.ts for why it
 * exists and when to delete it.
 *
 * A route handler rather than files on disk: the art is a pure function of the
 * URL, so there is nothing to store, nothing to upload (Ph2.md Out of Scope),
 * and nothing to keep in sync when a template is renamed.
 */

/** Cap the label so a crafted URL cannot make us render a novel into an SVG. */
const MAX_LABEL = 80;

export async function GET(
  request: NextRequest,
  { params }: { params: { surface: string; seed: string } },
) {
  // Validated, not trusted: `surface` indexes a lookup table, so an unchecked
  // value would be an object-injection lookup returning undefined and throwing
  // deeper in. Reject it at the door.
  if (!isPlaceholderSurface(params.surface)) {
    return new Response("Unknown surface", { status: 404 });
  }

  const { width, height } = PLACEHOLDER_SIZES[params.surface];
  const searchParams = request.nextUrl.searchParams;

  const label = (searchParams.get("label") ?? params.seed).slice(0, MAX_LABEL);
  const caption = searchParams.get("caption")?.slice(0, MAX_LABEL) || undefined;

  const svg = placeholderCover({
    seed: params.seed,
    label,
    caption,
    width,
    height,
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // Immutable: the output is a pure function of the URL, so a given URL can
      // never render differently. This is the whole performance story for
      // Ph2.md §10 — the art is generated once per URL and then cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      // The SVG is built from escaped input and contains no script, but this
      // costs nothing and means a future edit that adds one still cannot run.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
