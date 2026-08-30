import { notFound } from "next/navigation";
import Link from "next/link";
import { MemoryUploadForm } from "@/features/event-memories/components/memory-upload-form";
import {
  findPublicMemoryContext,
  memoryWindowState,
} from "@/services/memories";
export const dynamic = "force-dynamic";
export default async function PublicMemoriesPage({
  params,
}: {
  params: { slug: string };
}) {
  const context = await findPublicMemoryContext(params.slug);
  if (!context || !context.memorySettings?.enabled) notFound();
  const state = memoryWindowState(context.memorySettings);
  const title = context.eventTitle?.trim() || context.title;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900">
      <div className="mx-auto max-w-xl">
        <p className="text-sm uppercase tracking-[0.18em] text-stone-500">
          {title}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Share Your Memories</h1>
        <p className="mb-6 mt-3 text-stone-600">
          Having a great time? Share your photos
          {context.memorySettings.allowVideos ? " and videos" : ""} with the
          celebrants.
        </p>
        {state === "open" ? (
          <MemoryUploadForm
            slug={params.slug}
            allowVideos={context.memorySettings.allowVideos}
          />
        ) : (
          <p className="rounded-lg border bg-white p-5">
            {state === "not-open"
              ? "Memory sharing will open soon."
              : "Memory sharing is now closed."}
          </p>
        )}
        {["GUEST_GALLERY", "LIVE_WALL"].includes(
          context.memorySettings.mode,
        ) ? (
          <Link
            href={`/e/${params.slug}/memories/wall`}
            className="mt-5 inline-block underline"
          >
            View approved memories
          </Link>
        ) : null}
      </div>
    </main>
  );
}
