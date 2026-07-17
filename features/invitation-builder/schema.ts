import { z } from "zod";
import {
  isColorTheme,
  isTypography,
  isBackgroundStyle,
  isDecorativeStyle,
  isToggleableSection,
} from "@/lib/config/design-vocabulary";

/**
 * Invitation validation — Ph3.md §2–§6, §9.
 *
 * §9 asks for required fields, date consistency, time format, image
 * requirements, and character limits, with "clear, user-friendly error
 * messages". Every message here is written for the customer, not the developer:
 * it says what to do, not what failed.
 *
 * Pure — no Prisma, no React. Shared by the client form and the Server Action,
 * and the server copy is the one that counts.
 *
 * A note on emptiness: the builder autosaves half-finished work (§8), so almost
 * every field is optional *at save time*. "Required" is checked when the
 * customer tries to finish (see `completionErrors`), not while they are typing.
 * A validator that refuses to save an incomplete draft defeats autosave.
 */

// --- Shared primitives ---

/** Trim, and treat "" as absent. An empty input is not a value. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => v || undefined);

/**
 * Wall-clock time, "HH:mm" — Ph3.md §9 (Time Format).
 *
 * 24-hour, because it is unambiguous to parse. The UI presents it however the
 * locale wants; this is storage.
 */
export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use a 24-hour time, like 15:30.")
  .optional()
  .transform((v) => v || undefined);

/**
 * A calendar date from a date input, "YYYY-MM-DD".
 *
 * Parsed at UTC midnight rather than local: `new Date("2027-03-14")` is already
 * UTC, while `new Date(2027, 2, 14)` is the server's zone — and the server is
 * not in Cebu. Storing the local-midnight version would shift the date by a day
 * for anyone west of the server.
 */
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : undefined))
  .refine((d) => !d || !Number.isNaN(d.getTime()), "That date is not valid.");

/** IANA zone. Validated against the runtime's own list rather than a hard-coded one. */
const timeZoneSchema = z
  .string()
  .trim()
  .default("Asia/Manila")
  .refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, "That time zone is not recognised.");

// --- Step schemas ---

/** Ph3.md §11 — Rename Draft. */
export const draftTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give this draft a name.")
    .max(120, "Name must be 120 characters or fewer."),
});

/** Ph3.md §2 — Event Information. */
export const eventStepSchema = z
  .object({
    eventType: optionalText(60, "Event type"),
    eventTitle: optionalText(120, "Event title"),
    subtitle: optionalText(160, "Subtitle"),
    eventDate: dateSchema,
    eventTime: timeSchema,
    timeZone: timeZoneSchema,
    rsvpDeadline: dateSchema,
    dressCode: optionalText(120, "Dress code"),
    eventTheme: optionalText(120, "Theme"),
    language: z.string().trim().min(2).max(10).default("en"),
  })
  .refine(
    // Ph3.md §9 — Date Consistency. The single most valuable check here: an RSVP
    // deadline after the event is a printed mistake nobody catches until the
    // cards are in the post.
    (data) =>
      !data.eventDate ||
      !data.rsvpDeadline ||
      data.rsvpDeadline <= data.eventDate,
    {
      message: "The RSVP deadline must be on or before the event date.",
      path: ["rsvpDeadline"],
    },
  );

/** Ph3.md §3 — Host Information. */
export const hostSchema = z.object({
  id: z.string().uuid().optional(),
  role: z
    .string()
    .trim()
    .min(1, "Choose what this person is.")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "That host type is not recognised."),
  displayName: z
    .string()
    .trim()
    .min(1, "Add a name.")
    .max(120, "Name must be 120 characters or fewer."),
  biography: optionalText(600, "Biography"),
  photoAssetId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const hostsStepSchema = z.object({
  hosts: z
    .array(hostSchema)
    // 20 is not a design limit, it is a sanity limit — the largest real case is
    // a full wedding entourage, and anything past this is a script.
    .max(20, "That is more hosts than an invitation can show."),
});

/** Ph3.md §4 — Venue Information. */
export const venueSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["CEREMONY", "RECEPTION", "OTHER"]),
  name: z
    .string()
    .trim()
    .min(1, "Add the venue name.")
    .max(160, "Venue name must be 160 characters or fewer."),
  address: optionalText(400, "Address"),
  mapsUrl: z
    .string()
    .trim()
    .url("That does not look like a link. Paste the full URL from Google Maps.")
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  parkingNotes: optionalText(400, "Parking notes"),
  contactName: optionalText(120, "Contact name"),
  contactPhone: optionalText(40, "Contact number"),
  startTime: timeSchema,
});

export const venueStepSchema = z.object({
  venues: z
    .array(venueSchema)
    .max(6, "That is more venues than an invitation can show."),
});

/** Ph3.md §5 — Invitation Content. */
export const personSchema = z.object({
  id: z.string().uuid().optional(),
  group: z.enum(["PARENT", "SPONSOR", "ENTOURAGE"]),
  name: z
    .string()
    .trim()
    .min(1, "Add a name.")
    .max(120, "Name must be 120 characters or fewer."),
  role: optionalText(80, "Role"),
});

export const programItemSchema = z.object({
  id: z.string().uuid().optional(),
  time: timeSchema,
  title: z
    .string()
    .trim()
    .min(1, "Add what happens.")
    .max(120, "Title must be 120 characters or fewer."),
  description: optionalText(300, "Description"),
});

export const contentStepSchema = z.object({
  // Character limits are Ph3.md §9. These are sized to the printed card, not to
  // the database: a 2,000-character welcome message fits in Postgres and not on
  // an invitation, and the place to say so is here, before it is typeset.
  welcomeMessage: optionalText(500, "Welcome message"),
  invitationMessage: optionalText(1200, "Invitation message"),
  giftsPreference: optionalText(500, "Gift preference"),
  specialNotes: optionalText(800, "Special notes"),
  closingMessage: optionalText(300, "Closing message"),
  people: z
    .array(personSchema)
    .max(60, "That is more names than an invitation can show."),
  program: z
    .array(programItemSchema)
    .max(30, "That is a longer programme than an invitation can show."),
});

/** Ph3.md §6 — Personalization. Slugs only, checked against the approved system. */
export const personalizeStepSchema = z.object({
  colorTheme: z
    .string()
    .refine(isColorTheme, "That colour theme is not available."),
  typography: z
    .string()
    .refine(isTypography, "That typography set is not available."),
  backgroundStyle: z
    .string()
    .refine(isBackgroundStyle, "That background is not available."),
  decorativeStyle: z
    .string()
    .refine(isDecorativeStyle, "That decoration is not available."),
  hiddenSections: z
    .array(z.string())
    .default([])
    // Silently drop unknown sections rather than rejecting the save. A section
    // retired from the design system should not make an old draft unsaveable.
    .transform((slugs) => slugs.filter(isToggleableSection)),
});

/** Ph3.md §7 — Media Integration. */
export const mediaStepSchema = z.object({
  assignments: z
    .array(
      z.object({
        assetId: z.string().uuid(),
        slot: z.enum(["COVER", "COUPLE", "FAMILY", "LOGO", "MUSIC"]),
      }),
    )
    .max(40, "That is more photos than an invitation can show."),
});

export const templateStepSchema = z.object({
  templateSlug: z.string().trim().min(1, "Choose a template.").max(120),
});

export type EventStepInput = z.infer<typeof eventStepSchema>;
export type HostsStepInput = z.infer<typeof hostsStepSchema>;
export type VenueStepInput = z.infer<typeof venueStepSchema>;
export type ContentStepInput = z.infer<typeof contentStepSchema>;
export type PersonalizeStepInput = z.infer<typeof personalizeStepSchema>;
export type MediaStepInput = z.infer<typeof mediaStepSchema>;
