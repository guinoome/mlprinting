import "server-only";

import type { Prisma } from "@prisma/client";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { decidePublication } from "./state";
import { canTransitionPayment } from "./state";
import type { VerifiedPaymentEvent } from "./types";

export async function loadPublicationContext(
  tx: Prisma.TransactionClient,
  profileId: string,
  invitationId: string,
) {
  return tx.invitation.findFirst({
    where: { id: invitationId, profileId },
    select: {
      id: true,
      status: true,
      orders: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          items: { select: { kind: true, status: true } },
          payment: { select: { status: true } },
        },
      },
    },
  });
}

export async function getPublicationReadiness(
  profileId: string,
  invitationId: string,
) {
  if (!isDatabaseConfigured()) {
    return {
      allowed: false as const,
      code: "NO_ORDER" as const,
      reason: "Not available on this deployment.",
    };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const context = await loadPublicationContext(tx, profileId, invitationId);
      if (!context) return null;
      return decidePublication({
        invitationStatus: context.status,
        order: context.orders[0] ?? null,
      });
    });
  } catch (error) {
    logger.report(error, { at: "getPublicationReadiness", invitationId });
    return null;
  }
}

export async function recordOfflineSettlement(input: {
  orderId: string;
  actorId: string;
  amountMinor: number;
  currency: string;
  waiveReason: string | null;
}) {
  if (!isDatabaseConfigured())
    return { ok: false as const, message: "The database is not configured." };
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, payment: true },
      });
      if (!order) return { ok: false as const, message: "Order not found." };
      if (
        order.payment?.status === "CAPTURED" ||
        order.payment?.status === "WAIVED"
      ) {
        return {
          ok: false as const,
          message: "This order is already settled.",
        };
      }
      const status = input.waiveReason ? "WAIVED" : "CAPTURED";
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          status,
          amountMinor: input.waiveReason ? 0 : input.amountMinor,
          currency: input.currency,
          provider: input.waiveReason ? "staff-waiver" : "offline",
          providerReference: null,
          verifiedAt: new Date(),
        },
        create: {
          orderId: order.id,
          status,
          amountMinor: input.waiveReason ? 0 : input.amountMinor,
          currency: input.currency,
          provider: input.waiveReason ? "staff-waiver" : "offline",
          verifiedAt: new Date(),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: input.actorId,
          type: "PAYMENT_STATUS",
          fromStatus: order.payment?.status ?? null,
          toStatus: status,
          message: input.waiveReason
            ? `Payment waived by staff: ${input.waiveReason}`
            : `Offline payment verified: ${input.currency} ${(input.amountMinor / 100).toFixed(2)}.`,
        },
      });
      return { ok: true as const };
    });
  } catch (error) {
    logger.report(error, {
      at: "recordOfflineSettlement",
      orderId: input.orderId,
    });
    return { ok: false as const, message: "Could not record the settlement." };
  }
}

/** Persist only an event returned by a PaymentProvider's server-side verifier. */
export async function applyVerifiedPaymentEvent(event: VerifiedPaymentEvent) {
  if (!isDatabaseConfigured())
    return { ok: false as const, message: "The database is not configured." };
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: event.orderId },
        select: { id: true, payment: true },
      });
      if (!order) return { ok: false as const, message: "Order not found." };
      const current = order.payment;
      if (
        current &&
        (current.provider !== event.provider ||
          current.providerReference !== event.providerReference ||
          current.amountMinor !== event.amountMinor ||
          current.currency !== event.currency)
      ) {
        return {
          ok: false as const,
          message: "Verified payment does not match the order settlement.",
        };
      }
      if (current && !canTransitionPayment(current.status, event.status)) {
        return {
          ok: false as const,
          message: `Payment cannot move from ${current.status} to ${event.status}.`,
        };
      }
      if (current?.status === event.status) return { ok: true as const };
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: { status: event.status, verifiedAt: event.verifiedAt },
        create: {
          orderId: order.id,
          status: event.status,
          amountMinor: event.amountMinor,
          currency: event.currency,
          provider: event.provider,
          providerReference: event.providerReference,
          verifiedAt: event.verifiedAt,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: null,
          type: "PAYMENT_STATUS",
          fromStatus: current?.status ?? null,
          toStatus: event.status,
          message: `Server-verified ${event.provider} payment event.`,
        },
      });
      return { ok: true as const };
    });
  } catch (error) {
    logger.report(error, {
      at: "applyVerifiedPaymentEvent",
      orderId: event.orderId,
    });
    return {
      ok: false as const,
      message: "Could not apply the verified payment event.",
    };
  }
}
