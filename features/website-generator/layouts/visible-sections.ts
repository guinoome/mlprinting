import type { PreviewModel } from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { sectionOrder, type InvitationLayout, type SectionId } from "./types";

/**
 * Which sections an invitation actually renders, in the order its layout asks
 * for.
 *
 * Kept out of the renderer because the public invitation is the one page where
 * silently dropping a section cannot be undone — a guest never learns there was
 * a venue. JSX that interleaves "has this any content" with "where does it sit"
 * hides that decision; as a list it can be asserted against.
 *
 * The emptiness rules are the ones event-site.tsx has always applied, which are
 * in turn the in-app preview's shows() calls, so what the customer approves is
 * still what a guest sees.
 *
 * Pure: no React, and nothing from components/.
 */
export function visibleSections(
  model: PreviewModel,
  layout: InvitationLayout,
  opts: { hasCountdown: boolean; hasQr: boolean },
): SectionId[] {
  const present: Record<SectionId, boolean> = {
    welcome: shows(model, "welcome", Boolean(model.welcomeMessage)),
    // Both of these hang off the resolved event date — the calendar link is
    // built from the same target the countdown counts to — and neither has
    // ever been switchable from the editor, so neither consults model.hidden.
    countdown: opts.hasCountdown,
    actions: opts.hasCountdown,
    invitation: Boolean(model.invitationMessage),
    hosts: shows(model, "hosts", model.hosts.length > 0),
    parents: shows(model, "parents", model.parents.length > 0),
    sponsors: shows(model, "sponsors", model.sponsors.length > 0),
    venues: shows(model, "venues", model.venues.length > 0),
    program: shows(model, "program", model.program.length > 0),
    gallery: shows(model, "gallery", model.galleryUrls.length > 0),
    "dress-code": shows(model, "dress-code", Boolean(model.dressCode)),
    gifts: shows(model, "gifts", Boolean(model.giftsPreference)),
    notes: shows(model, "notes", Boolean(model.specialNotes)),
    // An invitation with nothing filled in still has to offer a reply, so the
    // only thing that removes it is the customer switching it off.
    rsvp: shows(model, "rsvp", true),
    closing: Boolean(model.closingMessage),
    qr: opts.hasQr,
  };

  return sectionOrder(layout).filter((id) => present[id]);
}
