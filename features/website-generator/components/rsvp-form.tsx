"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRsvp, type RsvpFormState } from "../actions";

const initialState: RsvpFormState = {};

/**
 * The guest-facing RSVP — Ph5.md §3. Interactive controls (a segmented
 * accept/decline, a guest stepper) over hidden inputs, so the values the server
 * action reads — `attending` (yes/no) and `guestCount` — are unchanged. Submits
 * once; a second submission is a second row (design doc Decision 3).
 */
export function RsvpForm({
  invitationId,
  accentColor,
}: {
  invitationId: string;
  accentColor: string;
}) {
  const [state, formAction] = useFormState(submitRsvp, initialState);
  const [attending, setAttending] = React.useState<"yes" | "no">("yes");
  const [count, setCount] = React.useState(1);

  if (state.success) {
    return (
      <div className="inv-rsvp-done">
        <span
          className="inv-rsvp-check"
          style={{ borderColor: accentColor, color: accentColor }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p style={{ color: accentColor, fontFamily: "var(--inv-heading)" }}>
          {attending === "yes"
            ? "Thank you — we can't wait to celebrate with you."
            : "Thank you for letting us know. You'll be missed."}
        </p>
      </div>
    );
  }

  const segment = (value: "yes" | "no", label: string) => {
    const on = attending === value;
    return (
      <button
        type="button"
        onClick={() => setAttending(value)}
        aria-pressed={on}
        className={on ? "inv-seg-btn is-on" : "inv-seg-btn"}
        style={on ? { background: accentColor, borderColor: accentColor, color: "#fff" } : undefined}
      >
        {label}
      </button>
    );
  };

  return (
    <form action={formAction} className="inv-form">
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="attending" value={attending} />
      <input type="hidden" name="guestCount" value={count} />

      <label htmlFor="guestName" className="sr-only">
        Your name
      </label>
      <Input id="guestName" name="guestName" placeholder="Your name" required maxLength={120} />

      <div className="inv-seg" role="group" aria-label="Will you attend?">
        {segment("yes", "Joyfully accept")}
        {segment("no", "Regretfully decline")}
      </div>

      {attending === "yes" ? (
        <div className="inv-stepper">
          <span className="inv-stepper-label">Guests in your party</span>
          <div className="inv-stepper-controls">
            <button
              type="button"
              className="inv-step"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="inv-step-val" aria-live="polite">
              {count}
            </span>
            <button
              type="button"
              className="inv-step"
              onClick={() => setCount((c) => Math.min(10, c + 1))}
              aria-label="More guests"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <label htmlFor="message" className="sr-only">
        Message
      </label>
      <Input
        id="message"
        name="message"
        placeholder="A message for the hosts (optional)"
        maxLength={500}
      />

      {state.error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        style={{ background: accentColor, color: "#fff" }}
      >
        Send response
      </Button>
    </form>
  );
}
