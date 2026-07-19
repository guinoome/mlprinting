import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Website-generator reads/writes — Ph5.md. The only module that queries the
 * public-website concerns of Invitation (slug, isPublished) and RsvpResponse.
 * Mirrors features/invitation-builder/repository.ts's shape: every write
 * proves ownership in the WHERE clause; the one read with no owner to check
 * (the public page itself) scopes on isPublished instead.
 */

const PUBLIC_INCLUDE = {
  template: { select: { id: true, name: true } },
  hosts: { orderBy: { sortOrder: "asc" } },
  venues: { orderBy: { sortOrder: "asc" } },
  content: true,
  people: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
  program: { orderBy: { sortOrder: "asc" } },
  personalization: true,
  media: {
    orderBy: { sortOrder: "asc" },
    include: {
      asset: {
        select: {
          id: true,
          bucket: true,
          storagePath: true,
          altText: true,
          originalFilename: true,
          version: true,
          width: true,
        },
      },
    },
  },
} satisfies Prisma.InvitationInclude;

export type PublicInvitation = Prisma.InvitationGetPayload<{
  include: typeof PUBLIC_INCLUDE;
}>;

/**
 * The published site's data, by its public slug. Null for a draft, an
 * unpublished site, or a slug nobody owns — the caller (the public route)
 * can't distinguish which, and must not: a `DRAFT` must be exactly as
 * unreachable as a slug that was never claimed.
 */
export async function getPublishedInvitation(
  slug: string,
): Promise<PublicInvitation | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { slug, isPublished: true },
      include: PUBLIC_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "getPublishedInvitation", slug });
    return null;
  }
}

/** One invitation, for its owner, with just the fields the publish-control page needs. */
export async function getInvitationForManage(
  profileId: string,
  invitationId: string,
) {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: {
        id: true,
        title: true,
        status: true,
        slug: true,
        isPublished: true,
      },
    });
  } catch (error) {
    logger.report(error, { at: "getInvitationForManage", invitationId });
    return null;
  }
}

/** `excludingInvitationId` lets an invitation "conflict" with its own current slug when re-saving without changing it. */
export async function isSlugAvailable(
  slug: string,
  excludingInvitationId?: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const existing = await prisma.invitation.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return true;
    return existing.id === excludingInvitationId;
  } catch (error) {
    logger.report(error, { at: "isSlugAvailable", slug });
    return false;
  }
}

export type PublishResult = { ok: true } | { ok: false; error: string };

/**
 * Publishing requires COMPLETED status and an available slug — both re-checked
 * here, not just in the UI that hides the button otherwise (design doc's
 * explicit constraint: this is the actual gate, not a courtesy).
 */
export async function publishInvitation(
  profileId: string,
  invitationId: string,
  slug: string,
): Promise<PublishResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { status: true },
    });
    if (!invitation) return { ok: false, error: "That invitation no longer exists." };
    if (invitation.status !== "COMPLETED") {
      return { ok: false, error: "Finish the invitation before publishing it." };
    }

    const available = await isSlugAvailable(slug, invitationId);
    if (!available) return { ok: false, error: "That web address is already taken." };

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { slug, isPublished: true },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "publishInvitation", invitationId });
    return { ok: false, error: "Could not publish. Please try again." };
  }
}

/** The slug is kept, not cleared — republishing later reuses the same URL and any already-printed QR code. */
export async function unpublishInvitation(
  profileId: string,
  invitationId: string,
): Promise<PublishResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    const found = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "That invitation no longer exists." };

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { isPublished: false },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "unpublishInvitation", invitationId });
    return { ok: false, error: "Could not unpublish. Please try again." };
  }
}

export interface RsvpInput {
  guestName: string;
  attending: boolean;
  guestCount: number;
  message: string | null;
}

export type CreateRsvpResult = { ok: true } | { ok: false; error: string };

/** Stores a guest's response. The caller (Task 10's Server Action) has already confirmed the invitation is published. */
export async function createRsvp(
  invitationId: string,
  input: RsvpInput,
): Promise<CreateRsvpResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    await prisma.rsvpResponse.create({
      data: {
        invitationId,
        guestName: input.guestName,
        attending: input.attending,
        guestCount: input.guestCount,
        message: input.message,
      },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "createRsvp", invitationId });
    return {
      ok: false,
      error: "Could not save your response. Please try again.",
    };
  }
}

/** True when the invitation exists and is published — the gate submitRsvp checks before writing. */
export async function invitationAcceptsRsvps(
  invitationId: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, isPublished: true },
      select: { id: true },
    });
    return invitation !== null;
  } catch (error) {
    logger.report(error, { at: "invitationAcceptsRsvps", invitationId });
    return false;
  }
}

export async function listRsvps(profileId: string, invitationId: string) {
  if (!isDatabaseConfigured()) return [];

  try {
    // Scoped through the invitation's own owner check — an RSVP row has no
    // profileId of its own, so ownership is proven via this join, not a
    // column on rsvp_responses.
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { id: true },
    });
    if (!invitation) return [];

    return await prisma.rsvpResponse.findMany({
      where: { invitationId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listRsvps", invitationId });
    return [];
  }
}
