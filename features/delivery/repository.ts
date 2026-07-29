import "server-only";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { DeliveryInput } from "./readiness";

/**
 * Everything the Delivery Center needs, in one query set — Ph8 §8.
 *
 * Scoped by profileId in the where clause rather than checked after loading.
 * The page is reached by event id from a URL, and an ownership check written as
 * an `if` after the fetch is one early return away from not happening.
 */
export interface DeliverySnapshot extends DeliveryInput {
  invitationId: string;
  /** Newest first, so a superseded file stays downloadable (Ph6 §12). */
  files: {
    id: string;
    createdAt: Date;
    status: string;
    version: number;
    pageSize: string;
    bytes: number | null;
  }[];
}

export async function getDeliverySnapshot(
  profileId: string,
  invitationId: string,
): Promise<DeliverySnapshot | null> {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: {
        id: true,
        status: true,
        slug: true,
        isPublished: true,
        eventTitle: true,
        pdfGenerations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            version: true,
            pageSize: true,
            bytes: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { reference: true, status: true },
        },
      },
    });

    if (!invitation) return null;

    const order = invitation.orders[0] ?? null;

    return {
      invitationId: invitation.id,
      invitation: {
        status: invitation.status,
        slug: invitation.slug,
        isPublished: invitation.isPublished,
        eventTitle: invitation.eventTitle,
      },
      pdfGenerations: invitation.pdfGenerations.map((g) => ({
        status: g.status,
      })),
      order: order ? { reference: order.reference, status: order.status } : null,
      // Payments are paused at the owner's instruction, so nothing can satisfy
      // the gate and delivery must not wait on it. One flag, one place to
      // change when the module lands — see readiness.ts.
      paymentRequired: false,
      files: invitation.pdfGenerations.map((g) => ({
        id: g.id,
        createdAt: g.createdAt,
        status: g.status,
        version: g.version,
        pageSize: g.pageSize,
        bytes: g.bytes,
      })),
    };
  } catch (error) {
    logger.report(error, { at: "getDeliverySnapshot", invitationId });
    return null;
  }
}
