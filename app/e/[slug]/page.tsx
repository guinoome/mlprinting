import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedInvitation } from "@/features/website-generator/repository";
import { zonedInstant } from "@/features/website-generator/countdown-time";
import { EventSite } from "@/features/website-generator/components/event-site";
import { toPreviewModel, type PreviewInput } from "@/lib/invitation/preview-model";
import { previewUrl } from "@/services/media";
import { features } from "@/lib/config";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Next calls generateMetadata and the page component separately, and both need
 * the same invitation. React's cache() dedupes them to one query per request.
 * Without it every guest visit costs two identical round trips — and this is
 * the one route in the product that guests hit in bursts, when a link is
 * shared to a group chat.
 */
const loadInvitation = cache(getPublishedInvitation);

/**
 * The public event website — Ph5.md. No auth: guests have no ML-DEP account.
 * A DRAFT invitation, or one that is not currently published, is
 * indistinguishable from a slug nobody ever claimed — both 404, and neither
 * reaches generateMetadata, so nothing unpublished is ever indexable.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  if (!features.websiteGenerator) return {};

  const invitation = await loadInvitation(params.slug);
  if (!invitation) return {};

  const title = invitation.eventTitle?.trim() || invitation.title;
  const cover = invitation.media.find((link) => link.slot === "COVER");

  return {
    // previewUrl returns a root-relative path (/api/media/...). Next resolves
    // relative OG image URLs against metadataBase, which defaults to
    // localhost:3000 — so without this, every shared link's preview image
    // points at a host no scraper can reach. Messenger/WhatsApp/Viber are how
    // these invitations actually get passed around, so a broken thumbnail is
    // the whole feature failing quietly in production.
    metadataBase: new URL(env.app.url),
    title,
    description: invitation.subtitle ?? `You're invited — ${title}`,
    openGraph: cover
      ? { title, images: [{ url: previewUrl(cover.asset) }] }
      : { title },
    // noindex applies to PUBLISHED sites too, and that is deliberate — not an
    // oversight to "fix" later. The design makes the slug memorable rather than
    // secret, so it is semi-guessable by construction. Publishing means "guests
    // I sent the link to can open this", not "put my wedding in Google". If a
    // customer ever wants a discoverable site, that is an explicit opt-in
    // stored on the invitation, never the default.
    robots: { index: false, follow: false },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!features.websiteGenerator) notFound();

  const invitation = await loadInvitation(params.slug);
  if (!invitation) notFound();

  const mediaUrls: Partial<
    Record<"COVER" | "COUPLE" | "FAMILY" | "LOGO", string[]>
  > = {};
  for (const link of invitation.media) {
    if (link.slot === "MUSIC") continue;
    const slot = link.slot as "COVER" | "COUPLE" | "FAMILY" | "LOGO";
    (mediaUrls[slot] ??= []).push(previewUrl(link.asset));
  }

  const input: PreviewInput = {
    eventTitle: invitation.eventTitle,
    subtitle: invitation.subtitle,
    templateCategory: invitation.template?.category?.slug ?? null,
    eventDate: invitation.eventDate,
    eventTime: invitation.eventTime,
    timeZone: invitation.timeZone,
    rsvpDeadline: invitation.rsvpDeadline,
    dressCode: invitation.dressCode,
    eventTheme: invitation.eventTheme,
    language: invitation.language,
    hosts: invitation.hosts,
    venues: invitation.venues,
    content: invitation.content,
    people: invitation.people,
    program: invitation.program,
    personalization: invitation.personalization,
    mediaUrls,
  };

  const model = toPreviewModel(input);

  const countdownTarget = invitation.eventDate
    ? zonedInstant(invitation.eventDate, invitation.eventTime, invitation.timeZone)
    : null;

  return (
    <EventSite
      invitationId={invitation.id}
      model={model}
      countdownTarget={countdownTarget}
    />
  );
}
