import "server-only";

import type { Prisma, Order, OrderItem } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  OrderStatusValue,
  OrderItemStatusValue,
  OrderItemKindValue,
  PriorityValue,
} from "./types";
import {
  canTransitionOrder,
  canTransitionItem,
  TransitionError,
} from "./status";
import { deriveOrderStatus } from "./derive";
import { nextReference } from "./reference";

/**
 * Order persistence — Ph7.md §1, §2, §12.
 *
 * Every status change and its audit row are written in ONE transaction. A
 * status that moved without leaving a trace is the exact failure this phase
 * exists to prevent, so it must not be reachable, not merely discouraged.
 *
 * These functions are staff-facing and assume the caller has already passed
 * requireStaff(). They do not re-check the role: the gate belongs at the entry
 * point, and duplicating it here would imply the entry point is optional.
 */

export type OrderRow = Order;
export type OrderItemRow = OrderItem;

const BOARD_INCLUDE = {
  order: {
    select: {
      id: true,
      reference: true,
      dueDate: true,
      profile: { select: { id: true, displayName: true, email: true } },
      invitation: { select: { id: true, title: true } },
    },
  },
  assignedTo: { select: { id: true, displayName: true, email: true } },
} satisfies Prisma.OrderItemInclude;

export type BoardItem = Prisma.OrderItemGetPayload<{
  include: typeof BOARD_INCLUDE;
}>;

/** Everything currently on the production board — Ph7.md §4, §10. */
export async function listBoardItems(): Promise<BoardItem[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.orderItem.findMany({
      // Finished and abandoned work leaves the board. It stays on the order.
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: BOARD_INCLUDE,
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    logger.report(error, { at: "listBoardItems" });
    return [];
  }
}

const ORDER_INCLUDE = {
  profile: { select: { id: true, displayName: true, email: true } },
  assignedTo: { select: { id: true, displayName: true } },
  invitation: { select: { id: true, title: true } },
  items: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export async function listOrders(): Promise<OrderWithItems[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listOrders" });
    return [];
  }
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "getOrder", id });
    return null;
  }
}

export interface CreateOrderInput {
  profileId: string;
  invitationId: string | null;
  actorId: string;
}

/** Creates an order with the next reference for the current year. */
export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderRow | null> {
  if (!isDatabaseConfigured()) return null;

  const year = new Date().getFullYear();

  try {
    return await prisma.$transaction(async (tx) => {
      const highest = await tx.order.findFirst({
        where: { reference: { startsWith: `ML-${year}-` } },
        orderBy: { reference: "desc" },
        select: { reference: true },
      });

      const order = await tx.order.create({
        data: {
          profileId: input.profileId,
          invitationId: input.invitationId,
          reference: nextReference(year, highest?.reference ?? null),
          status: "INQUIRY",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: input.actorId,
          type: "STATUS_CHANGE",
          toStatus: "INQUIRY",
          message: `Order ${order.reference} created.`,
        },
      });

      return order;
    });
  } catch (error) {
    logger.report(error, { at: "createOrder", profileId: input.profileId });
    return null;
  }
}

export interface AddItemInput {
  orderId: string;
  kind: OrderItemKindValue;
  quantity: number;
  priority: PriorityValue;
  actorId: string;
}

export async function addItem(
  input: AddItemInput,
): Promise<OrderItemRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.create({
        data: {
          orderId: input.orderId,
          kind: input.kind,
          quantity: input.quantity,
          priority: input.priority,
          status: "PENDING",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          orderItemId: item.id,
          actorId: input.actorId,
          type: "ITEM_ADDED",
          toStatus: "PENDING",
          message: `Added ${input.kind}.`,
        },
      });

      return item;
    });
  } catch (error) {
    logger.report(error, { at: "addItem", orderId: input.orderId });
    return null;
  }
}

export type MoveResult = { ok: true } | { ok: false; message: string };

/**
 * Moves an item, writes its audit row, and lets the order's own status follow —
 * all in one transaction. The derived order move is checked against the same
 * table a human move goes through and gets its own audit row, so the history
 * explains why the order advanced.
 */
export async function moveItem(
  itemId: string,
  to: OrderItemStatusValue,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: itemId },
        select: { id: true, orderId: true, status: true },
      });
      if (!item) throw new Error("not-found");

      const from = item.status as OrderItemStatusValue;
      if (!canTransitionItem(from, to)) throw new TransitionError(from, to);

      await tx.orderItem.update({ where: { id: itemId }, data: { status: to } });
      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          orderItemId: item.id,
          actorId,
          type: "STATUS_CHANGE",
          fromStatus: from,
          toStatus: to,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: item.orderId },
        select: { status: true, items: { select: { status: true } } },
      });
      if (!order) return;

      const derived = deriveOrderStatus(
        order.status as OrderStatusValue,
        order.items.map((each) => each.status as OrderItemStatusValue),
      );
      if (!derived) return;

      await tx.order.update({
        where: { id: item.orderId },
        data: { status: derived },
      });
      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
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
      return { ok: false, message: error.message };
    }
    logger.report(error, { at: "moveItem", itemId });
    return { ok: false, message: "Could not move that item. Try again." };
  }
}

/** A staff-initiated move of the order itself, e.g. Inquiry to Quotation. */
export async function moveOrder(
  orderId: string,
  to: OrderStatusValue,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order) throw new Error("not-found");

      const from = order.status as OrderStatusValue;
      if (!canTransitionOrder(from, to)) throw new TransitionError(from, to);

      await tx.order.update({ where: { id: orderId }, data: { status: to } });
      await tx.orderEvent.create({
        data: {
          orderId,
          actorId,
          type: "STATUS_CHANGE",
          fromStatus: from,
          toStatus: to,
        },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) {
      return { ok: false, message: error.message };
    }
    logger.report(error, { at: "moveOrder", orderId });
    return { ok: false, message: "Could not update that order. Try again." };
  }
}

export async function assignItem(
  itemId: string,
  assigneeId: string | null,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { assignedToId: assigneeId },
        select: { orderId: true },
      });

      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          orderItemId: itemId,
          actorId,
          type: "ASSIGNED",
          message: assigneeId ? "Assigned." : "Unassigned.",
        },
      });
    });

    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "assignItem", itemId });
    return { ok: false, message: "Could not assign that item. Try again." };
  }
}

/** Staff-only note — Ph7.md §8. Never shown to a customer. */
export async function addNote(
  orderId: string,
  authorId: string,
  body: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderNote.create({ data: { orderId, authorId, body } });
      await tx.orderEvent.create({
        data: { orderId, actorId: authorId, type: "NOTE_ADDED" },
      });
    });

    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "addNote", orderId });
    return { ok: false, message: "Could not save that note. Try again." };
  }
}
