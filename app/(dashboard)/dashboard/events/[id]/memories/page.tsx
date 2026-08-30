/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import {
  findOwnerMemoryContext,
  listOwnerMemorySubmissions,
} from "@/services/memories";
import {
  moderateMemory,
  saveMemorySettings,
} from "@/features/event-memories/actions";
const dateInput = (date: Date | null | undefined) =>
  date?.toISOString().slice(0, 16) ?? "";
export default async function EventMemoriesSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);
  const event = await findOwnerMemoryContext(profile.id, params.id);
  if (!event) notFound();
  const settings = event.memorySettings;
  const submissions = await listOwnerMemorySubmissions(profile.id, event.id);
  return (
    <>
      <PageHeader
        title="Event memories"
        description={`Guest sharing for "${event.title}".`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "Memories" },
        ]}
      />
      <form
        action={saveMemorySettings}
        className="max-w-2xl space-y-5 rounded-lg border p-6"
      >
        <input type="hidden" name="invitationId" value={event.id} />
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings?.enabled ?? false}
          />
          <span>
            <span className="block font-medium">
              Enable guest memory sharing
            </span>
            <span className="text-sm text-muted-foreground">
              Guests receive an upload link; every submission starts pending
              approval.
            </span>
          </span>
        </label>
        <label className="block text-sm">
          Collection mode
          <select
            name="mode"
            defaultValue={settings?.mode ?? "PRIVATE_COLLECTION"}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3"
          >
            <option value="PRIVATE_COLLECTION">Private collection</option>
            <option value="GUEST_GALLERY">Approved guest gallery</option>
            <option value="LIVE_WALL">Approved live memory wall</option>
            <option value="POST_EVENT_ARCHIVE">Post-event archive</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Opens at
            <input
              type="datetime-local"
              name="opensAt"
              defaultValue={dateInput(settings?.opensAt)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
            />
          </label>
          <label className="text-sm">
            Closes at
            <input
              type="datetime-local"
              name="closesAt"
              defaultValue={dateInput(settings?.closesAt)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowVideos"
            defaultChecked={settings?.allowVideos ?? false}
          />{" "}
          Accept supported videos as well as photos
        </label>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Save memory settings
        </button>
        {event.slug ? (
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${encodeURIComponent(event.slug)}?target=memories`}
              alt="QR code for the guest memory upload link"
              className="size-28 rounded-md border bg-white p-2"
            />
            <p>
              Guest link:{" "}
              <a
                className="underline"
                href={routes.publicEventMemories(event.slug)}
              >
                {routes.publicEventMemories(event.slug)}
              </a>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Publish this invitation to receive a guest link.
          </p>
        )}
      </form>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Moderation queue</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Nothing appears publicly until you approve it.
        </p>
        {submissions.length === 0 ? (
          <p className="rounded-lg border p-5 text-sm text-muted-foreground">
            No guest memories yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submissions.map((memory) => (
              <article
                key={memory.id}
                className="overflow-hidden rounded-lg border"
              >
                <div className="aspect-square bg-muted">
                  {memory.mimeType.startsWith("video/") ? (
                    <video
                      src={`/api/memories/${memory.id}`}
                      controls
                      className="size-full object-cover"
                    />
                  ) : (
                    <img
                      src={`/api/memories/${memory.id}`}
                      alt={memory.caption ?? "Guest memory"}
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-sm font-medium">
                    {memory.guestName ?? "Guest"}
                  </p>
                  {memory.caption ? (
                    <p className="text-sm text-muted-foreground">
                      {memory.caption}
                    </p>
                  ) : null}
                  <p className="text-xs">
                    Status: {memory.status.toLowerCase()}
                  </p>
                  <form action={moderateMemory} className="flex gap-2">
                    <input type="hidden" name="id" value={memory.id} />
                    <input type="hidden" name="invitationId" value={event.id} />
                    <button
                      name="status"
                      value="APPROVED"
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs text-white"
                    >
                      Approve
                    </button>
                    <button
                      name="status"
                      value="REJECTED"
                      className="rounded-md border px-3 py-1.5 text-xs"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
