import { colorTheme, typography } from "@/lib/config/design-vocabulary";

/**
 * The preview's view model — Ph3.md §10, §12.
 *
 * This module is the proof that §12 works. It takes the invitation dataset
 * (content) plus the personalization (approved choices) and produces what a
 * renderer needs — without either input knowing a renderer exists.
 *
 * It is deliberately NOT the website generator. Ph5 owns that, and Ph3.md's Out
 * of Scope forbids building it here. The difference is not cosmetic:
 *
 *   This preview  — one component, in-app, approximate, updates as you type.
 *   Ph5 generator — a standalone deployable site, its own routing and SEO.
 *
 * They will share this view model and nothing else. When Ph5 arrives it should
 * import `toPreviewModel` and build its own renderer on top — the resolved
 * shape is the contract, and duplicating the resolution logic is how the
 * preview and the real site start disagreeing about what the invitation says.
 *
 * Pure: no React, no Prisma, no fetch. Which is why it is testable.
 */

export type PreviewSurface = "desktop" | "mobile" | "print";

/** The raw dataset, shaped as the repository returns it. */
export interface PreviewInput {
  eventTitle: string | null;
  subtitle: string | null;
  eventDate: Date | null;
  eventTime: string | null;
  timeZone: string;
  rsvpDeadline: Date | null;
  dressCode: string | null;
  eventTheme: string | null;
  language: string;
  hosts: {
    id: string;
    role: string;
    displayName: string;
    biography: string | null;
  }[];
  venues: {
    id: string;
    kind: "CEREMONY" | "RECEPTION" | "OTHER";
    name: string;
    address: string | null;
    mapsUrl: string | null;
    parkingNotes: string | null;
    startTime: string | null;
  }[];
  content: {
    welcomeMessage: string | null;
    invitationMessage: string | null;
    giftsPreference: string | null;
    specialNotes: string | null;
    closingMessage: string | null;
  } | null;
  people: {
    id: string;
    group: "PARENT" | "SPONSOR" | "ENTOURAGE";
    name: string;
    role: string | null;
  }[];
  program: {
    id: string;
    time: string | null;
    title: string;
    description: string | null;
  }[];
  personalization: {
    colorTheme: string;
    typography: string;
    backgroundStyle: string;
    decorativeStyle: string;
    hiddenSections: string[];
  } | null;
  /** Slot → resolved URLs. The model never resolves storage itself. */
  mediaUrls: Partial<Record<"COVER" | "COUPLE" | "FAMILY" | "LOGO", string[]>>;
}

/** Resolved design values, ready to hand to a renderer as CSS. */
export interface PreviewStyle {
  background: string;
  foreground: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  backgroundStyle: string;
  decorativeStyle: string;
}

export interface PreviewModel {
  title: string;
  subtitle: string | null;
  /** Preformatted for display. The model formats; the renderer never parses a date. */
  dateLine: string | null;
  timeLine: string | null;
  hosts: { id: string; name: string; biography: string | null }[];
  venues: {
    id: string;
    label: string;
    name: string;
    address: string | null;
    mapsUrl: string | null;
    parkingNotes: string | null;
    timeLine: string | null;
  }[];
  welcomeMessage: string | null;
  invitationMessage: string | null;
  parents: { id: string; name: string; role: string | null }[];
  sponsors: { id: string; name: string; role: string | null }[];
  program: {
    id: string;
    time: string | null;
    title: string;
    description: string | null;
  }[];
  giftsPreference: string | null;
  specialNotes: string | null;
  closingMessage: string | null;
  dressCode: string | null;
  eventTheme: string | null;
  rsvpLine: string | null;
  coverImageUrl: string | null;
  galleryUrls: string[];
  style: PreviewStyle;
  /** Sections the customer switched off — the renderer skips these. */
  hidden: Set<string>;
}

const VENUE_LABELS: Record<PreviewInput["venues"][number]["kind"], string> = {
  CEREMONY: "Ceremony",
  RECEPTION: "Reception",
  OTHER: "Venue",
};

/**
 * Format a date in the event's own time zone.
 *
 * The zone matters: a Cebu wedding viewed from London must print the Cebu date.
 * Without an explicit timeZone, Intl uses the *viewer's* zone, and an event just
 * after midnight would show the previous day to half the guest list.
 */
export function formatDate(
  date: Date,
  timeZone: string,
  language: string,
): string {
  try {
    return new Intl.DateTimeFormat(language || "en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }).format(date);
  } catch {
    // A bad zone or language tag must not blank the invitation.
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
}

/**
 * "15:30" → "3:30 PM".
 *
 * Formatted from the stored wall-clock string, not from a Date: the time is a
 * fact about the venue's clock, and pushing it through a timezone conversion is
 * how an invitation ends up announcing a 7am reception.
 */
export function formatTime(time: string, language: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return time;

  try {
    // A fixed UTC date carries the wall-clock digits through Intl without ever
    // implying an instant.
    const carrier = new Date(Date.UTC(2000, 0, 1, hours, minutes));
    return new Intl.DateTimeFormat(language || "en", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(carrier);
  } catch {
    return time;
  }
}

export function toPreviewModel(input: PreviewInput): PreviewModel {
  const theme = colorTheme(
    input.personalization?.colorTheme ?? "classic-ivory",
  );
  const type = typography(input.personalization?.typography ?? "classic-serif");
  const language = input.language || "en";

  const dateLine = input.eventDate
    ? formatDate(input.eventDate, input.timeZone, language)
    : null;

  const timeLine = input.eventTime
    ? formatTime(input.eventTime, language)
    : null;

  return {
    // A placeholder title, not an empty heading: the preview is shown from the
    // first step, before anything is typed, and a blank page teaches nothing.
    title: input.eventTitle?.trim() || "Your event title",
    subtitle: input.subtitle,
    dateLine,
    timeLine,

    hosts: input.hosts.map((host) => ({
      id: host.id,
      name: host.displayName,
      biography: host.biography,
    })),

    venues: input.venues.map((venue) => ({
      id: venue.id,
      label: VENUE_LABELS[venue.kind],
      name: venue.name,
      address: venue.address,
      mapsUrl: venue.mapsUrl,
      parkingNotes: venue.parkingNotes,
      timeLine: venue.startTime ? formatTime(venue.startTime, language) : null,
    })),

    welcomeMessage: input.content?.welcomeMessage ?? null,
    invitationMessage: input.content?.invitationMessage ?? null,
    giftsPreference: input.content?.giftsPreference ?? null,
    specialNotes: input.content?.specialNotes ?? null,
    closingMessage: input.content?.closingMessage ?? null,

    parents: input.people
      .filter((person) => person.group === "PARENT")
      .map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role,
      })),
    sponsors: input.people
      .filter((person) => person.group === "SPONSOR")
      .map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role,
      })),

    program: input.program.map((item) => ({
      id: item.id,
      time: item.time ? formatTime(item.time, language) : null,
      title: item.title,
      description: item.description,
    })),

    dressCode: input.dressCode,
    eventTheme: input.eventTheme,

    rsvpLine: input.rsvpDeadline
      ? `Kindly reply by ${formatDate(input.rsvpDeadline, input.timeZone, language)}`
      : null,

    coverImageUrl: input.mediaUrls.COVER?.[0] ?? null,
    galleryUrls: [
      ...(input.mediaUrls.COUPLE ?? []),
      ...(input.mediaUrls.FAMILY ?? []),
    ],

    style: {
      background: theme.swatch.background,
      foreground: theme.swatch.foreground,
      accent: theme.swatch.accent,
      headingFont: type.preview.heading,
      bodyFont: type.preview.body,
      backgroundStyle: input.personalization?.backgroundStyle ?? "plain",
      decorativeStyle: input.personalization?.decorativeStyle ?? "none",
    },

    hidden: new Set(input.personalization?.hiddenSections ?? []),
  };
}

/** True when a section should render: not hidden, and has something to show. */
export function shows(
  model: PreviewModel,
  section: string,
  hasContent: boolean,
): boolean {
  return !model.hidden.has(section) && hasContent;
}
