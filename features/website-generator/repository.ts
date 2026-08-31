import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import { decidePublication, loadPublicationContext } from "@/services/commerce";
import type { RsvpCriteria } from "./rsvp-intelligence";

/**
 * Website-generator reads/writes — Ph5.md. The only module that queries the
 * public-website concerns of Invitation (slug, isPublished) and RsvpResponse.
 * Mirrors features/invitation-builder/repository.ts's shape: every write
 * proves ownership in the WHERE clause; the one read with no owner to check
 * (the public page itself) scopes on isPublished instead.
 */

const PUBLIC_INCLUDE = {
  template: {
    select: {
      id: true,
      slug: true,
      name: true,
      category: { select: { slug: true } },
    },
  },
  hosts: { orderBy: { sortOrder: "asc" } },
  venues: { orderBy: { sortOrder: "asc" } },
  content: true,
  people: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
  program: { orderBy: { sortOrder: "asc" } },
  personalization: true,
  memorySettings: true,
  media: {
    orderBy: { sortOrder: "asc" },
    include: {
      derivative: {
        select: { id: true, sourceVersion: true },
      },
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
    return await prisma.$transaction(async (tx) => {
      const context = await loadPublicationContext(tx, profileId, invitationId);
      if (!context) {
        return { ok: false, error: "That invitation no longer exists." };
      }
      const decision = decidePublication({
        invitationStatus: context.status,
        order: context.orders[0] ?? null,
      });
      if (!decision.allowed) return { ok: false, error: decision.reason };

      const existing = await tx.invitation.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing && existing.id !== invitationId) {
        return { ok: false, error: "That web address is already taken." };
      }

      await tx.invitation.update({
        where: { id: invitationId },
        data: { slug, isPublished: true },
      });
      await tx.orderEvent.create({
        data: {
          orderId: decision.orderId,
          actorId: profileId,
          type: "PUBLICATION",
          fromStatus: "UNPUBLISHED",
          toStatus: "PUBLISHED",
          message: `Invitation published at /e/${slug}.`,
        },
      });
      return { ok: true };
    });
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
    return await prisma.$transaction(async (tx) => {
      const found = await tx.invitation.findFirst({
        where: { id: invitationId, profileId },
        select: {
          id: true,
          slug: true,
          orders: {
            where: { status: { not: "CANCELLED" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (!found)
        return { ok: false, error: "That invitation no longer exists." };

      await tx.invitation.update({
        where: { id: invitationId },
        data: { isPublished: false },
      });
      const order = found.orders[0];
      if (order) {
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            actorId: profileId,
            type: "PUBLICATION",
            fromStatus: "PUBLISHED",
            toStatus: "UNPUBLISHED",
            message: found.slug
              ? `Invitation unpublished from /e/${found.slug}.`
              : "Invitation unpublished.",
          },
        });
      }
      return { ok: true };
    });
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

export async function listRsvps(
  profileId: string,
  invitationId: string,
  criteria: RsvpCriteria = { query: "", status: "all" },
) {
  if (!isDatabaseConfigured()) return [];
  if (criteria.status === "pending") return [];

  try {
    // Scoped through the invitation's own owner check — an RSVP row has no
    // profileId of its own, so ownership is proven via this join, not a
    // column on rsvp_responses.
    return await prisma.rsvpResponse.findMany({
      where: {
        invitationId,
        invitation: { profileId },
        ...(criteria.query
          ? {
              OR: [
                {
                  guestName: { contains: criteria.query, mode: "insensitive" },
                },
                { message: { contains: criteria.query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(criteria.status === "attending"
          ? { attending: true }
          : criteria.status === "declined"
            ? { attending: false }
            : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listRsvps", invitationId });
    return [];
  }
}

export interface RsvpSummary {
  responseCount: number;
  attendingResponses: number;
  attendingGuests: number;
  declinedResponses: number;
  /** Null until a guest manifest exists; zero would falsely mean nobody is pending. */
  pendingGuests: number | null;
}

export async function getRsvpSummary(
  profileId: string,
  invitationId: string,
): Promise<RsvpSummary> {
  const empty = {
    responseCount: 0,
    attendingResponses: 0,
    attendingGuests: 0,
    declinedResponses: 0,
    pendingGuests: null,
  };
  if (!isDatabaseConfigured()) return empty;

  try {
    const where = { invitationId, invitation: { profileId } };
    const [responseCount, attendingResponses, declinedResponses, attending] =
      await prisma.$transaction([
        prisma.rsvpResponse.count({ where }),
        prisma.rsvpResponse.count({ where: { ...where, attending: true } }),
        prisma.rsvpResponse.count({ where: { ...where, attending: false } }),
        prisma.rsvpResponse.aggregate({
          where: { ...where, attending: true },
          _sum: { guestCount: true },
        }),
      ]);
    return {
      responseCount,
      attendingResponses,
      attendingGuests: attending._sum.guestCount ?? 0,
      declinedResponses,
      pendingGuests: null,
    };
  } catch (error) {
    logger.report(error, { at: "getRsvpSummary", invitationId });
    return empty;
  }
}
