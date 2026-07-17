"use client";

import * as React from "react";
import { saveEventStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { FormField } from "@/components/form/form-field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/**
 * Event Information — Ph3.md §2.
 *
 * The autosave pattern every step follows: local state, `markDirty()` on
 * change, and a `save` closure that posts the current values. State is local so
 * typing stays instant; the debounce in useAutosave decides when the server
 * hears about it.
 */

export interface EventStepValues {
  eventType: string;
  eventTitle: string;
  subtitle: string;
  eventDate: string;
  eventTime: string;
  timeZone: string;
  rsvpDeadline: string;
  dressCode: string;
  eventTheme: string;
  language: string;
}

/** Zones a Cebu print shop plausibly needs. Not the full IANA list — that is 400 entries. */
const TIME_ZONES = [
  { value: "Asia/Manila", label: "Philippines (Manila)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "Europe/London", label: "United Kingdom" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
  { value: "ceb", label: "Cebuano" },
];

export function EventStep({
  invitationId,
  initial,
  eventTypes,
}: {
  invitationId: string;
  initial: EventStepValues;
  eventTypes: { slug: string; name: string }[];
}) {
  const [values, setValues] = React.useState(initial);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    for (const [key, value] of Object.entries(values)) formData.set(key, value);

    const result = await saveEventStep({}, formData);
    setFieldErrors(result.fieldErrors ?? {});

    // A field error is a real failure to save, and the hook must keep the work
    // marked dirty — otherwise the unload warning would not fire on a draft
    // whose RSVP date is inconsistent.
    if (result.fieldErrors) return { error: "Some fields need attention." };
    return result;
  }, [invitationId, values]);

  const autosave = useAutosave({ save });

  function set<K extends keyof EventStepValues>(
    key: K,
    value: EventStepValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    autosave.markDirty();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eventType">Event type</Label>
          <Select
            id="eventType"
            value={values.eventType}
            onChange={(event) => set("eventType", event.target.value)}
          >
            <option value="">Choose one…</option>
            {eventTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Sets which host types we suggest on the next step.
          </p>
        </div>

        <div className="sm:col-span-2">
          <FormField
            label="Event title"
            name="eventTitle"
            value={values.eventTitle}
            onChange={(event) => set("eventTitle", event.target.value)}
            placeholder="Maria & Jose"
            error={fieldErrors.eventTitle}
            hint="The heading on the invitation."
          />
        </div>

        <div className="sm:col-span-2">
          <FormField
            label="Subtitle"
            name="subtitle"
            value={values.subtitle}
            onChange={(event) => set("subtitle", event.target.value)}
            placeholder="are getting married"
            error={fieldErrors.subtitle}
          />
        </div>

        <FormField
          label="Event date"
          name="eventDate"
          type="date"
          value={values.eventDate}
          onChange={(event) => set("eventDate", event.target.value)}
          error={fieldErrors.eventDate}
        />

        <FormField
          label="Start time"
          name="eventTime"
          type="time"
          value={values.eventTime}
          onChange={(event) => set("eventTime", event.target.value)}
          error={fieldErrors.eventTime}
          hint="The time on the invitation."
        />

        <div className="space-y-2">
          <Label htmlFor="timeZone">Time zone</Label>
          <Select
            id="timeZone"
            value={values.timeZone}
            onChange={(event) => set("timeZone", event.target.value)}
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            So guests abroad see the right date.
          </p>
        </div>

        <FormField
          label="RSVP deadline"
          name="rsvpDeadline"
          type="date"
          value={values.rsvpDeadline}
          onChange={(event) => set("rsvpDeadline", event.target.value)}
          error={fieldErrors.rsvpDeadline}
        />

        <FormField
          label="Dress code"
          name="dressCode"
          value={values.dressCode}
          onChange={(event) => set("dressCode", event.target.value)}
          placeholder="Formal — long gown and barong"
          error={fieldErrors.dressCode}
        />

        <FormField
          label="Event theme"
          name="eventTheme"
          value={values.eventTheme}
          onChange={(event) => set("eventTheme", event.target.value)}
          placeholder="Enchanted Garden"
          error={fieldErrors.eventTheme}
          hint="The event's own theme — not the colours, which come later."
        />

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            id="language"
            value={values.language}
            onChange={(event) => set("language", event.target.value)}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}
