"use client";
import { useFormState } from "react-dom";
import { submitGuestMemory, type MemoryUploadState } from "../actions";
const initial: MemoryUploadState = {};
export function MemoryUploadForm({
  slug,
  allowVideos,
}: {
  slug: string;
  allowVideos: boolean;
}) {
  const [state, action] = useFormState(submitGuestMemory, initial);
  if (state.success)
    return (
      <p className="rounded-lg bg-emerald-50 p-4 text-emerald-900">
        Thank you. Your memory was sent for approval.
      </p>
    );
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-sm">
        Your name
        <input
          name="guestName"
          maxLength={120}
          className="mt-1 h-10 w-full rounded-md border px-3"
        />
      </label>
      <label className="block text-sm">
        Photo{allowVideos ? " or video" : ""}
        <input
          name="file"
          type="file"
          required
          accept={
            allowVideos
              ? "image/*,video/mp4,video/webm,video/quicktime"
              : "image/*"
          }
          className="mt-1 block w-full text-sm"
        />
      </label>
      <label className="block text-sm">
        Caption (optional)
        <textarea
          name="caption"
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-md border p-3"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      <button
        type="submit"
        className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white"
      >
        Share memory
      </button>
      <p className="text-xs text-stone-500">
        Uploads are private until the organizer approves them.
      </p>
    </form>
  );
}
