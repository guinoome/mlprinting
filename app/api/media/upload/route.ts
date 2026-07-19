import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { createAsset, replaceAsset } from "@/services/media";
import { validateUpload } from "@/services/upload";

/**
 * Upload endpoint — design doc Decision 3's implementation note. One file per
 * request: the Upload Manager's per-file progress bar (Ph4.md §3) needs one
 * XHR per file to report progress meaningfully: a single request carrying five
 * files would show one progress bar for all of them, which answers the wrong
 * question ("how much of the batch" instead of "how much of THIS file").
 *
 * Never Edge: createAsset/replaceAsset call sharp, a native binary.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Please sign in again." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Choose a file first." },
      { status: 400 },
    );
  }

  // Checked here as well as inside createAsset/replaceAsset, same reasoning as
  // features/invitation-builder/media-actions.ts: this is the layer that can
  // say it next to the request, before any processing runs.
  const failure = validateUpload(
    { name: file.name, size: file.size, type: file.type },
    "image",
  );
  if (failure) {
    return NextResponse.json(
      { ok: false, error: failure.message },
      { status: 400 },
    );
  }

  const assetId = formData.get("assetId")?.toString();

  if (assetId) {
    const result = await replaceAsset(profile.id, assetId, file);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true, assetId });
  }

  const altText = formData.get("altText")?.toString();
  const tagsRaw = formData.get("tags")?.toString();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const result = await createAsset({ profileId: profile.id, file, altText, tags });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, assetId: result.assetId });
}
