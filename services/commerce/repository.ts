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
      if (
        order.payment?.provider === "paymongo" &&
        order.payment.providerReference
      ) {
        return {
          ok: false as const,
          message:
            "Cancel the active online checkout before recording another settlement.",
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

/** Staff sets the amount the provider must later match; this does not mark paid. */
export async function prepareOnlineSettlement(input: {
  orderId: string;
  actorId: string;
  amountMinor: number;
  currency: string;
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
        return { ok: false as const, message: "This order is already settled." };
      }
      if (order.payment?.status === "AUTHORIZED") {
        return {
          ok: false as const,
          message: "An authorized payment cannot be replaced.",
        };
      }
      if (
        order.payment?.status === "PENDING" &&
        order.payment.providerReference
      ) {
        return {
          ok: false as const,
          message: "A customer checkout is already active for this order.",
        };
      }

      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          status: "PENDING",
          amountMinor: input.amountMinor,
          currency: input.currency,
          provider: "paymongo",
          providerReference: null,
          verifiedAt: null,
        },
        create: {
          orderId: order.id,
          status: "PENDING",
          amountMinor: input.amountMinor,
          currency: input.currency,
          provider: "paymongo",
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: input.actorId,
          type: "PAYMENT_STATUS",
          fromStatus: order.payment?.status ?? null,
          toStatus: "PENDING",
          message: `Online payment prepared: ${input.currency} ${(input.amountMinor / 100).toFixed(2)} via PayMongo.`,
        },
      });
      return { ok: true as const };
    });
  } catch (error) {
    logger.report(error, {
      at: "prepareOnlineSettlement",
      orderId: input.orderId,
    });
    return { ok: false as const, message: "Could not prepare online payment." };
  }
}

export async function getCustomerOnlineSettlement(
  profileId: string,
  orderId: string,
) {
  if (!isDatabaseConfigured()) return null;
  try {
    return await prisma.order.findFirst({
      where: { id: orderId, profileId },
      select: { id: true, reference: true, payment: true },
    });
  } catch (error) {
    logger.report(error, { at: "getCustomerOnlineSettlement", orderId });
    return null;
  }
}

export async function getStaffOnlineSettlement(orderId: string) {
  if (!isDatabaseConfigured()) return null;
  try {
    return await prisma.payment.findUnique({ where: { orderId } });
  } catch (error) {
    logger.report(error, { at: "getStaffOnlineSettlement", orderId });
    return null;
  }
}

/** Called only after PayMongo confirms the hosted session was expired. */
export async function resetExpiredOnlineSettlement(input: {
  orderId: string;
  actorId: string;
  providerReference: string;
}) {
  if (!isDatabaseConfigured())
    return { ok: false as const, message: "The database is not configured." };
  try {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { orderId: input.orderId },
      });
      if (
        !payment ||
        payment.provider !== "paymongo" ||
        payment.providerReference !== input.providerReference ||
        payment.status !== "PENDING"
      ) {
        return {
          ok: false as const,
          message: "The online checkout is no longer active.",
        };
      }
      await tx.payment.update({
        where: { orderId: input.orderId },
        data: {
          status: "FAILED",
          providerReference: null,
          verifiedAt: new Date(),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          actorId: input.actorId,
          type: "PAYMENT_STATUS",
          fromStatus: "PENDING",
          toStatus: "FAILED",
          message: "PayMongo checkout expired by staff before replacement.",
        },
      });
      return { ok: true as const };
    });
  } catch (error) {
    logger.report(error, {
      at: "resetExpiredOnlineSettlement",
      orderId: input.orderId,
    });
    return { ok: false as const, message: "Could not reset online payment." };
  }
}

export async function bindOnlinePaymentReference(input: {
  profileId: string;
  orderId: string;
  providerReference: string;
}) {
  if (!isDatabaseConfigured()) return false;
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, profileId: input.profileId },
        select: { payment: true },
      });
      if (
        !order?.payment ||
        order.payment.provider !== "paymongo" ||
        order.payment.status !== "PENDING"
      ) {
        return false;
      }
      if (
        order.payment.providerReference &&
        order.payment.providerReference !== input.providerReference
      ) {
        return false;
      }
      await tx.payment.update({
        where: { orderId: input.orderId },
        data: { providerReference: input.providerReference },
      });
      return true;
    });
  } catch (error) {
    logger.report(error, {
      at: "bindOnlinePaymentReference",
      orderId: input.orderId,
    });
    return false;
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
      if (!current) {
        return {
          ok: false as const,
          message: "No prepared settlement exists for this order.",
        };
      }
      if (
        current.provider !== event.provider ||
          (current.providerReference !== null &&
            current.providerReference !== event.providerReference) ||
          current.amountMinor !== event.amountMinor ||
          current.currency !== event.currency
      ) {
        return {
          ok: false as const,
          message: "Verified payment does not match the order settlement.",
        };
      }
      if (!canTransitionPayment(current.status, event.status)) {
        return {
          ok: false as const,
          message: `Payment cannot move from ${current.status} to ${event.status}.`,
        };
      }
      if (current.status === event.status) return { ok: true as const };
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          status: event.status,
          providerReference: event.providerReference,
          verifiedAt: event.verifiedAt,
        },
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
          fromStatus: current.status,
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
