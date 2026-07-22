import type { Metadata } from "next";
import type { PreviewModel } from "@/lib/invitation/preview-model";
import { EventSite } from "@/features/website-generator/components/event-site";

/**
 * A live sample invitation — the same renderer a real shared link uses, with
 * stand-in data, so the design can be seen before any customer has published
 * one. Noindexed; safe to remove once real invitations exist.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sample invitation",
  robots: { index: false, follow: false },
};

const model: PreviewModel = {
  title: "Maria & Jose",
  subtitle: "are getting married",
  dateLine: "Saturday, 14 February 2026",
  timeLine: "3:00 PM",
  hosts: [
    { id: "a", name: "Maria Santos", biography: null },
    { id: "b", name: "Jose Rivera", biography: null },
  ],
  venues: [
    {
      id: "v1",
      label: "Ceremony",
      name: "Santo Niño Basilica",
      address: "Osmeña Blvd, Cebu City",
      mapsUrl: "https://maps.google.com",
      parkingNotes: "Parking available at the plaza",
      timeLine: "3:00 PM",
    },
    {
      id: "v2",
      label: "Reception",
      name: "Marco Polo Plaza",
      address: "Nivel Hills, Cebu City",
      mapsUrl: "https://maps.google.com",
      parkingNotes: null,
      timeLine: "6:00 PM",
    },
  ],
  welcomeMessage:
    "With hearts full of joy, we invite you to celebrate the beginning of our forever.",
  invitationMessage:
    "Together with our families, we request the honour of your presence as we exchange our vows.",
  parents: [
    { id: "p1", name: "Mr. & Mrs. Santos", role: "Parents of the bride" },
    { id: "p2", name: "Mr. & Mrs. Rivera", role: "Parents of the groom" },
  ],
  sponsors: [
    { id: "s1", name: "Atty. Ramon Cruz", role: null },
    { id: "s2", name: "Dr. Elena Reyes", role: null },
  ],
  program: [
    { id: "g1", time: "3:00 PM", title: "Ceremony", description: "Santo Niño Basilica" },
    { id: "g2", time: "5:00 PM", title: "Cocktails", description: null },
    { id: "g3", time: "6:00 PM", title: "Reception & Dinner", description: "Marco Polo Plaza" },
  ],
  giftsPreference: "Your presence is the only gift we ask for.",
  specialNotes: null,
  closingMessage: "We can't wait to celebrate with you.",
  dressCode: "Formal · Blush and sage",
  eventTheme: null,
  rsvpLine: "Kindly reply by 20 January 2026",
  coverImageUrl:
    "/api/placeholder/desktop/ivory-lace?label=Maria%20%26%20Jose&caption=Wedding",
  galleryUrls: [],
  musicUrl: "/sample-invitation.wav",
  eventKind: "wedding",
  style: {
    background: "#fbf3f2",
    foreground: "#4a3b3e",
    accent: "#b0868c",
    headingFont: "Didot, 'Bodoni MT', 'Hoefler Text', Georgia, serif",
    bodyFont: "'Gill Sans', 'Century Gothic', system-ui, sans-serif",
    backgroundStyle: "soft-gradient",
    decorativeStyle: "none",
  },
  hidden: new Set<string>(),
};

const target = new Date(Date.now() + 128 * 24 * 60 * 60 * 1000);

export default function InvitePreview() {
  return <EventSite invitationId="preview" model={model} countdownTarget={target} />;
}
