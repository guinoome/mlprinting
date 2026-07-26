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
    venues: [
      {
        id: "v1",
        label: "Ceremony",
        name: "Santo Niño Basilica",
        address: "Osmeña Blvd, Cebu City",
        mapsUrl: "https://www.google.com/maps/search/?api=1&query=Santo+Nino+Basilica+Cebu",
        parkingNotes: "Parking available at the plaza",
        timeLine: "3:00 PM",
      },
      {
        id: "v2",
        label: "Reception",
        name: "Marco Polo Plaza",
        address: "Nivel Hills, Cebu City",
        mapsUrl: "https://www.google.com/maps/search/?api=1&query=Marco+Polo+Plaza+Cebu",
        parkingNotes: null,
        timeLine: "6:00 PM",
      },
    ],
    welcomeMessage: k.welcome,
    invitationMessage:
      "Together with our families, we request the honour of your presence.",
    parents: [],
    sponsors: [],
    program: [
      { id: "g1", time: "3:00 PM", title: "Ceremony", description: null },
      { id: "g2", time: "5:00 PM", title: "Cocktails", description: null },
      {
        id: "g3",
        time: "6:00 PM",
        title: "Reception and dinner",
        description: null,
      },
    ],
    giftsPreference: "Your presence is the only gift we ask for.",
    specialNotes: null,
    closingMessage: "We can't wait to celebrate with you.",
    dressCode: "Formal",
    eventTheme: null,
    rsvpLine: "Kindly reply by 20 January 2026",
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
