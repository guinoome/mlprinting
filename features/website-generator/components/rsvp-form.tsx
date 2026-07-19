"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRsvp, type RsvpFormState } from "../actions";

const initialState: RsvpFormState = {};

/**
 * The guest-facing RSVP form — Ph5.md §3. Submits once; there is no
 * edit-after-submit (design doc Decision 3) — a second submission is a
 * second row, not an update, and this form does not attempt to prevent one.
 */
export function RsvpForm({
  invitationId,
  accentColor,
}: {
  invitationId: string;
  accentColor: string;
}) {
  const [state, formAction] = useFormState(submitRsvp, initialState);

  if (state.success) {
    return (
      <p
        className="text-center text-sm font-medium"
        style={{ color: accentColor }}
      >
        Thank you — your response has been recorded.
      </p>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-3">
      <input type="hidden" name="invitationId" value={invitationId} />

      <div>
        <label htmlFor="guestName" className="sr-only">
          Your name
        </label>
        <Input
          id="guestName"
          name="guestName"
          placeholder="Your name"
          required
          maxLength={120}
        />
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="attending" value="yes" defaultChecked required />
          Joyfully accepts
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="attending" value="no" />
          Regretfully declines
        </label>
      </div>

      <div>
        <label htmlFor="guestCount" className="sr-only">
          Number of guests
        </label>
        <Input
          id="guestCount"
          name="guestCount"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
        />
      </div>

      <div>
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <Input
          id="message"
          name="message"
          placeholder="A message for the hosts (optional)"
          maxLength={500}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        Send response
      </Button>
    </form>
  );
}
