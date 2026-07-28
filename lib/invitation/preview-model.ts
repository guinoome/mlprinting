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

export type PreviewSurface = "desktop" | "tablet" | "mobile" | "print";

/**
 * The kind of celebration, used to tune the public invitation's motion and copy
 * (confetti shape, hero eyebrow). Derived, never stored — so an invitation with
 * no template still resolves to a sensible "general".
 */
export type EventKind =
  | "wedding"
  | "engagement"
  | "debut"
  | "birthday"
  | "christening"
  | "baby-shower"
  | "anniversary"
  | "graduation"
  | "corporate"
  | "reunion"
  | "family"
  | "fiesta"
  | "religious"
  | "community"
  | "funeral"
  | "general";

/**
 * Checked in order, so the more specific kinds come first: an engagement's
 * copy often mentions the wedding, and a baby shower's often mentions the baby.
 */
const EVENT_KINDS: Exclude<EventKind, "general">[] = [
  "engagement",
  "baby-shower",
  "funeral",
  "reunion",
  "christening",
  "graduation",
  "anniversary",
  "corporate",
  "community",
  "religious",
  "fiesta",
  "family",
  "debut",
  "wedding",
  "birthday",
];

/** Best-effort event kind from the template category, then the theme and title. */
/** Category names and older labels that do not equal their kind. */
const KIND_ALIASES: Record<string, EventKind> = {
  memorial: "funeral",
  baptism: "christening",
  dedication: "christening",
  "family-celebration": "family",
  "community-event": "community",
  "corporate-event": "corporate",
  handaan: "family",
};

export function deriveEventKind(
  templateCategory: string | null | undefined,
  eventTheme: string | null | undefined,
  eventTitle: string | null | undefined,
): EventKind {
  // The template's category is a chosen fact, not a guess, so it decides on its
  // own and never competes with the free text. Merging all three into one string
  // and scanning it meant a wedding titled "The Santos Family Wedding" resolved
  // as a family celebration: "family" sits earlier in the scan order, so a
  // coincidence in the title outranked the category the customer picked.
  const category = (templateCategory ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (category) {
    const resolved =
      KIND_ALIASES[category] ??
      EVENT_KINDS.find((kind) => kind === category) ??
      null;
    if (resolved) return resolved;
  }

  // No usable category — fall back to whatever the theme and title suggest.
  const haystack = `${eventTheme ?? ""} ${eventTitle ?? ""}`.toLowerCase();
  for (const kind of EVENT_KINDS) {
    if (haystack.includes(kind)) return kind;
  }
  // Written forms the slug match misses: a title says "Baby Shower", never
  // "baby-shower", and a memorial notice rarely uses the word "funeral".
  if (/baby\s*shower/.test(haystack)) return "baby-shower";
  if (/memorial|in loving memory|wake|requiem/.test(haystack)) return "funeral";
  if (/homecoming|get-?together/.test(haystack)) return "reunion";
  if (/handaan|salu-?salo|family celebration/.test(haystack)) return "family";
  if (/santo|patron|barrio fiesta|sinulog/.test(haystack)) return "fiesta";
  if (/mass|blessing|novena|thanksgiving|church/.test(haystack)) return "religious";
  if (/barangay|assembly|civic|community/.test(haystack)) return "community";
  if (/betroth|proposal|engaged/.test(haystack)) return "engagement";
  if (/baptism|dedication|christening/.test(haystack)) return "christening";
  if (/\bwed\b|nuptial/.test(haystack)) return "wedding";
  return "general";
}

/** The raw dataset, shaped as the repository returns it. */
export interface PreviewInput {
  eventTitle: string | null;
  subtitle: string | null;
  /** Template category slug, when the invitation was built from one — tunes the public site. */
  templateCategory?: string | null;
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
  mediaUrls: Partial<Record<MediaSlotKey, string[]>>;
}

/**
 * The media slots a renderer understands, mirroring Prisma's MediaSlot.
 *
 * Exported because three call sites were each re-typing the same union inline,
 * which is how a new slot gets added to the database and silently dropped on
 * the way to the page — the compiler has nothing to disagree with when the
 * shape is written out by hand in every consumer.
 */
export type MediaSlotKey =
  | "COVER"
  | "COUPLE"
  | "FAMILY"
  | "LOGO"
  | "MUSIC"
  | "VIDEO";

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
  /**
   * The hero's moving background, when one has been uploaded — increment 5.
   *
   * Null is the normal case and not a degraded one: `coverImageUrl` is the
   * poster, so a hero with no video is exactly the hero that shipped before
   * this field existed.
   */
  heroVideoUrl: string | null;
  galleryUrls: string[];
  /** Optional background track (customer upload); the public site offers a play toggle. */
  musicUrl: string | null;
  style: PreviewStyle;
  /** The celebration kind — drives the public site's confetti and hero copy. */
  eventKind: EventKind;
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
    heroVideoUrl: input.mediaUrls.VIDEO?.[0] ?? null,
    galleryUrls: [
      ...(input.mediaUrls.COUPLE ?? []),
      ...(input.mediaUrls.FAMILY ?? []),
    ],
    musicUrl: input.mediaUrls.MUSIC?.[0] ?? null,

    eventKind: deriveEventKind(
      input.templateCategory,
      input.eventTheme,
      input.eventTitle,
    ),

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
