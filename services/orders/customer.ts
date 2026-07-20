import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { OrderItemStatusValue } from "./types";
import { TransitionError } from "./status";
import { deriveOrderStatus } from "./derive";
import type { OrderStatusValue } from "./types";
import type { MoveResult } from "./repository";

/**
 * Customer-facing order reads and actions — Ph7.md §3, §5, §6.
 *
 * Everything here is scoped to the signed-in customer through the order's
 * profileId, enforced in the WHERE clause rather than trusted from the caller.
 * These are the counterpart to repository.ts's staff functions: same engine,
 * a different, narrower door.
 *
 * A customer may only act on an item that is currently with them for review.
 * Approving locks it for production (§6); requesting a revision sends it back to
 * drafting with a description that becomes part of the audit trail (§5).
 */

/** The one status from which a customer may approve or request changes. */
export function canCustomerReview(status: OrderItemStatusValue): boolean {
  return status === "CUSTOMER_REVIEW";
}

/** Human-facing revision number from the count of prior revisions. */
export function revisionNumberFrom(priorRevisions: number): number {
  return priorRevisions + 1;
}

const CUSTOMER_ORDER_INCLUDE = {
  invitation: { select: { id: true, title: true, slug: true, isPublished: true } },
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      pdfGeneration: { select: { id: true, status: true, version: true } },
    },
  },
} satisfies Prisma.OrderInclude;

export type CustomerOrder = Prisma.OrderGetPayload<{
  include: typeof CUSTOMER_ORDER_INCLUDE;
}>;

/** The customer's own orders, newest first. */
export async function listOrdersForCustomer(
  profileId: string,
): Promise<CustomerOrder[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.order.findMany({
      where: { profileId },
      include: CUSTOMER_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listOrdersForCustomer", profileId });
    return [];
  }
}

/** One order, only if this customer owns it. Null otherwise — never "not yours". */
export async function getOrderForCustomer(
  profileId: string,
  orderId: string,
): Promise<CustomerOrder | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.order.findFirst({
      where: { id: orderId, profileId },
      include: CUSTOMER_ORDER_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "getOrderForCustomer", orderId });
    return null;
  }
}

/**
 * Shared guard: load an item, prove the customer owns it through its order, and
 * confirm it is currently with them for review. Returns the item's orderId and
 * current status, or throws — the caller runs this inside its transaction.
 */
async function loadReviewableItem(
  tx: Prisma.TransactionClient,
  profileId: string,
  itemId: string,
): Promise<{ orderId: string; status: OrderItemStatusValue }> {
  const item = await tx.orderItem.findFirst({
    where: { id: itemId, order: { profileId } },
    select: { id: true, orderId: true, status: true },
  });
  // A missing item and one owned by someone else are the same answer, so
  // ownership never leaks through the error.
  if (!item) throw new Error("not-found");

  const status = item.status as OrderItemStatusValue;
  if (!canCustomerReview(status)) {
    throw new TransitionError(status, "customer-action");
  }
  return { orderId: item.orderId, status };
}

/** Customer approves a proof — CUSTOMER_REVIEW → APPROVED, locking it (§6). */
export async function approveItem(
  profileId: string,
  itemId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { orderId, status } = await loadReviewableItem(tx, profileId, itemId);

      await tx.orderItem.update({
        where: { id: itemId },
        data: { status: "APPROVED" },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          orderItemId: itemId,
          actorId: profileId,
          type: "STATUS_CHANGE",
          fromStatus: status,
          toStatus: "APPROVED",
          message: "Approved by customer.",
        },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) {
      return { ok: false, message: "This item is not awaiting your review." };
    }
    logger.report(error, { at: "approveItem", itemId });
    return { ok: false, message: "Could not record your approval. Try again." };
  }
}

/**
 * Customer requests changes — CUSTOMER_REVIEW → REVISION, with a description
 * that lands in the audit trail as the revision record (§5). The order's status
 * follows in the same transaction, so it does not appear "in progress" once
 * every item is back with the shop.
 */
export async function requestRevision(
  profileId: string,
  itemId: string,
  description: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { orderId, status } = await loadReviewableItem(tx, profileId, itemId);

      const priorRevisions = await tx.orderEvent.count({
        where: { orderItemId: itemId, type: "STATUS_CHANGE", toStatus: "REVISION" },
      });
      const revision = revisionNumberFrom(priorRevisions);

      await tx.orderItem.update({
        where: { id: itemId },
        data: { status: "REVISION" },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          orderItemId: itemId,
          actorId: profileId,
          type: "STATUS_CHANGE",
          fromStatus: status,
          toStatus: "REVISION",
          message: `Revision ${revision} requested: ${description}`,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true, items: { select: { status: true } } },
      });
      if (!order) return;

      const derived = deriveOrderStatus(
        order.status as OrderStatusValue,
        order.items.map((each) => each.status as OrderItemStatusValue),
      );
      if (!derived) return;

      await tx.order.update({ where: { id: orderId }, data: { status: derived } });
      await tx.orderEvent.create({
        data: {
          orderId,
          actorId: null,
          type: "STATUS_CHANGE",
          fromStatus: order.status,
          toStatus: derived,
          message: "Followed its items.",
        },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) {
      return { ok: false, message: "This item is not awaiting your review." };
    }
    logger.report(error, { at: "requestRevision", itemId });
    return { ok: false, message: "Could not send your request. Try again." };
  }
}
