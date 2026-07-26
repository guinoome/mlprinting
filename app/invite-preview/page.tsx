import type { Metadata } from "next";
import type { EventKind, PreviewModel } from "@/lib/invitation/preview-model";
import { EventSite } from "@/features/website-generator/components/event-site";
import { getTemplateBySlug } from "@/features/template-marketplace/repository";
import { isDatabaseConfigured } from "@/lib/db";

/**
 * A live sample invitation — the same renderer a real shared link uses, filled
 * with stand-in content.
 *
 * With `?template=<slug>` it dresses itself as that template: the template's
 * own cover art, and sample content matching its category. That is what makes
 * the marketplace honest — a customer sees the animated invitation a template
 * actually produces, not a screenshot of one. Noindexed: it is a demo, not a
 * real event.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sample invitation",
  robots: { index: false, follow: false },
};

const HEADING =
  "Didot, 'Bodoni MT', 'Hoefler Text', Georgia, 'Times New Roman', serif";
const BODY = "'Gill Sans', 'Century Gothic', 'Segoe UI', system-ui, sans-serif";

/** Sample content per celebration, so every category demos as itself. */
interface KindSpec {
  title: string;
  subtitle: string;
  hosts: string[];
  welcome: string;
  bg: string;
  fg: string;
  accent: string;
  /**
   * Overrides for the shared celebratory copy below. A memorial needs every one
   * of them — "Cocktails" on the programme and "can't wait to celebrate" at the
   * end would be worse than having no sample at all.
   */
  invitation?: string;
  venues?: { label: string; name: string; address: string; time: string }[];
  program?: { time: string; title: string }[];
  gifts?: string | null;
  rsvpLine?: string | null;
  closing?: string;
  dressCode?: string | null;
}

const KINDS: Record<EventKind, KindSpec> = {
  wedding: {
    title: "Maria & Jose",
    subtitle: "are getting married",
    hosts: ["Maria Santos", "Jose Rivera"],
    welcome:
      "With hearts full of joy, we invite you to celebrate the beginning of our forever.",
    bg: "#fbf3f2",
    fg: "#4a3b3e",
    accent: "#b0868c",
  },
  debut: {
    title: "Isabella at Eighteen",
    subtitle: "a debut celebration",
    hosts: ["Isabella Cruz"],
    welcome:
      "Come celebrate eighteen years of joy, and the woman I am becoming.",
    bg: "#fbf1ec",
    fg: "#5a3f3a",
    accent: "#bd8b6e",
  },
  birthday: {
    title: "Emma turns Seven",
    subtitle: "please join the fun",
    hosts: ["Emma"],
    welcome: "There will be cake, games, and a very excited seven-year-old.",
    bg: "#fff5ef",
    fg: "#5a3a30",
    accent: "#e2725b",
  },
  christening: {
    title: "Baby Noah",
    subtitle: "is being christened",
    hosts: ["Noah Reyes"],
    welcome:
      "With grateful hearts, we welcome our little one into the family of faith.",
    bg: "#f0f4f8",
    fg: "#33414a",
    accent: "#7d9bc0",
  },
  anniversary: {
    title: "Fifty Golden Years",
    subtitle: "Ramon & Elena",
    hosts: ["Ramon Villanueva", "Elena Villanueva"],
    welcome: "Fifty years later, we would love to celebrate with you again.",
    bg: "#faf5ea",
    fg: "#4a4230",
    accent: "#b08d3c",
  },
  graduation: {
    title: "The Class of 2026",
    subtitle: "Maria graduates",
    hosts: ["Maria Santos"],
    welcome: "Four years, one degree, and the people who made it possible.",
    bg: "#f1f3f7",
    fg: "#2b3450",
    accent: "#b08d3c",
  },
  corporate: {
    title: "The Annual Gala",
    subtitle: "an evening with ML Holdings",
    hosts: [],
    welcome: "Join us for an evening of recognition, dinner, and celebration.",
    bg: "#1f2836",
    fg: "#f3ecdd",
    accent: "#c9a227",
  },
  engagement: {
    title: "She Said Yes",
    subtitle: "Maria & Jose are engaged",
    hosts: ["Maria Santos", "Jose Rivera"],
    welcome:
      "After eight years and one very nervous question, we are getting married.",
    bg: "#fbf2f1",
    fg: "#54393c",
    accent: "#c08a86",
  },
  "baby-shower": {
    title: "Baby Reyes",
    subtitle: "a baby shower",
    hosts: ["Ana Reyes"],
    welcome:
      "We are expecting, and we would love to celebrate with the people we love most.",
    bg: "#f7f4ef",
    fg: "#4a4438",
    accent: "#a39a7c",
  },
  reunion: {
    title: "The Santos Reunion",
    subtitle: "four generations, one long table",
    hosts: ["The Santos Family"],
    welcome:
      "It has been too long. Bring the children, bring the stories, bring an appetite.",
    bg: "#f2f4f7",
    fg: "#2c3550",
    accent: "#b08d3c",
  },
  /**
   * A memorial notice. The copy is written as an announcement of a service —
   * no celebration language, no exclamation, nothing that reads as festive.
   */
  funeral: {
    title: "Rosario Santos",
    subtitle: "1948 — 2026",
    hosts: ["The Santos Family"],
    welcome:
      "With grateful hearts for a life well lived, we invite you to join us in remembrance.",
    bg: "#f6f6f4",
    fg: "#3f4144",
    accent: "#8b8d88",
    invitation:
      "The family of Rosario Santos thanks you for your prayers and kindness during this time.",
    venues: [
      {
        label: "Wake",
        name: "Cosmopolitan Funeral Homes",
        address: "N. Bacalso Ave, Cebu City",
        time: "Daily, 9:00 AM to 9:00 PM",
      },
      {
        label: "Mass and interment",
        name: "Santo Niño Basilica",
        address: "Osmeña Blvd, Cebu City",
        time: "8:00 AM",
      },
    ],
    program: [
      { time: "8:00 AM", title: "Funeral mass" },
      { time: "10:00 AM", title: "Procession" },
      { time: "11:00 AM", title: "Interment" },
    ],
    gifts: "In lieu of flowers, the family welcomes donations to the parish.",
    rsvpLine: null,
    closing: "Thank you for keeping her in your prayers.",
    dressCode: null,
  },
  general: {
    title: "You're Invited",
    subtitle: "join us to celebrate",
    hosts: [],
    welcome: "We would love for you to be there.",
    bg: "#faf5ea",
    fg: "#41392c",
    accent: "#b08d3c",
  },
};

function sampleModel(kind: EventKind, coverImageUrl: string | null): PreviewModel {
  const k = KINDS[kind];
  return {
    title: k.title,
    subtitle: k.subtitle,
    dateLine: "Saturday, 14 February 2026",
    timeLine: "3:00 PM",
    hosts: k.hosts.map((name, i) => ({
      id: String(i),
      name,
      biography: null,
    })),
    venues: (
      k.venues ?? [
        {
          label: "Ceremony",
          name: "Santo Niño Basilica",
          address: "Osmeña Blvd, Cebu City",
          time: "3:00 PM",
        },
        {
          label: "Reception",
          name: "Marco Polo Plaza",
          address: "Nivel Hills, Cebu City",
          time: "6:00 PM",
        },
      ]
    ).map((v, i) => ({
      id: `v${i}`,
      label: v.label,
      name: v.name,
      address: v.address,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${v.name} ${v.address}`,
      )}`,
      parkingNotes: null,
      timeLine: v.time,
    })),
    welcomeMessage: k.welcome,
    invitationMessage:
      k.invitation ??
      "Together with our families, we request the honour of your presence.",
    parents: [],
    sponsors: [],
    program: (
      k.program ?? [
        { time: "3:00 PM", title: "Ceremony" },
        { time: "5:00 PM", title: "Cocktails" },
        { time: "6:00 PM", title: "Reception and dinner" },
      ]
    ).map((p, i) => ({
      id: `g${i}`,
      time: p.time,
      title: p.title,
      description: null,
    })),
    giftsPreference:
      k.gifts === undefined
        ? "Your presence is the only gift we ask for."
        : k.gifts,
    specialNotes: null,
    closingMessage: k.closing ?? "We can't wait to celebrate with you.",
    dressCode: k.dressCode === undefined ? "Formal" : k.dressCode,
    eventTheme: null,
    rsvpLine:
      k.rsvpLine === undefined ? "Kindly reply by 20 January 2026" : k.rsvpLine,
    coverImageUrl,
    galleryUrls: [],
    musicUrl: "/sample-invitation.wav",
    style: {
      background: k.bg,
      foreground: k.fg,
      accent: k.accent,
      headingFont: HEADING,
      bodyFont: BODY,
      backgroundStyle: "soft-gradient",
      decorativeStyle: "none",
    },
    eventKind: kind,
    hidden: new Set<string>(),
  };
}

/** A fixed date well ahead, so the countdown always has something to count. */
const TARGET = new Date(Date.UTC(2026, 1, 14, 7, 0, 0));

export default async function InvitePreviewPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  let kind: EventKind = "wedding";
  let cover: string | null =
    "/api/placeholder/desktop/ivory-lace?label=Maria%20%26%20Jose&caption=Wedding";

  const slug = searchParams.template;
  if (slug && isDatabaseConfigured()) {
    const template = await getTemplateBySlug(slug);
    if (template) {
      // The template's own category picks the sample content, and its own cover
      // art heads the page — so this is that template, not a generic demo.
      const category = template.category.slug;
      kind = category in KINDS ? (category as EventKind) : "general";
      cover = template.coverImageUrl;
    }
  }

  return (
    <EventSite
      invitationId="preview"
      model={sampleModel(kind, cover)}
      countdownTarget={TARGET}
    />
  );
}
