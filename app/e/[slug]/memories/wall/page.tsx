/* eslint-disable @next/next/no-img-element */ import { notFound } from "next/navigation";
import { LiveWallRefresh } from "@/features/event-memories/components/live-wall-refresh";
import {
  findPublicMemoryContext,
  listPublicApprovedMemories,
} from "@/services/memories";
export const dynamic = "force-dynamic";
export default async function MemoryWallPage({
  params,
}: {
  params: { slug: string };
}) {
  const context = await findPublicMemoryContext(params.slug);
  const settings = context?.memorySettings;
  if (
    !context ||
    !settings?.enabled ||
    !["GUEST_GALLERY", "LIVE_WALL"].includes(settings.mode)
  )
    notFound();
  const memories = await listPublicApprovedMemories(params.slug);
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-white">
      <LiveWallRefresh enabled={settings.mode === "LIVE_WALL"} />
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.18em] text-white/60">
          Approved memories
        </p>
        <h1 className="mb-6 mt-2 text-3xl font-semibold">
          {context.eventTitle?.trim() || context.title}
        </h1>
        {memories.length === 0 ? (
          <p className="rounded-xl border border-white/20 p-6 text-white/70">
            Approved memories will appear here.
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {memories.map((memory) => (
              <figure
                key={memory.id}
                className="mb-4 break-inside-avoid overflow-hidden rounded-xl bg-white/10"
              >
                {memory.mimeType.startsWith("video/") ? (
                  <video
                    src={`/api/memories/${memory.id}`}
                    controls
                    playsInline
                    className="w-full"
                  />
                ) : (
                  <img
                    src={`/api/memories/${memory.id}`}
                    alt={memory.caption ?? "Guest memory"}
                    className="w-full"
                  />
                )}
                {memory.caption || memory.guestName ? (
                  <figcaption className="p-3 text-sm text-white/80">
                    {memory.caption}
                    {memory.caption && memory.guestName ? " — " : ""}
                    {memory.guestName}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
