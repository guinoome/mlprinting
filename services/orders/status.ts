import type { OrderStatusValue, OrderItemStatusValue } from "./types";

/**
 * Transition rules — Ph7.md §2 ("status transitions must be controlled and
 * auditable"). This module is the controlled half; OrderEvent is the auditable
 * half.
 *
 * A table rather than conditionals scattered across actions: the legal moves
 * are then a single readable thing, every rejection is testable, and adding a
 * state cannot silently leave a hole somewhere else in the codebase.
 *
 * A status maps to the set of statuses it may move to. An empty array means
 * terminal.
 */

export const ORDER_TRANSITIONS: Record<
  OrderStatusValue,
  readonly OrderStatusValue[]
> = {
  INQUIRY: ["QUOTATION", "CANCELLED"],
  QUOTATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  // Archiving is the only move out of COMPLETED: an order that is done can be
  // filed away, but never reopened. Reopening would break what the audit trail
  // means — the history says it finished.
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: [],
};

export const ITEM_TRANSITIONS: Record<
  OrderItemStatusValue,
  readonly OrderItemStatusValue[]
> = {
  PENDING: ["DRAFT_CREATION", "CANCELLED"],
  DRAFT_CREATION: ["CUSTOMER_REVIEW", "CANCELLED"],
  CUSTOMER_REVIEW: ["APPROVED", "REVISION", "CANCELLED"],
  REVISION: ["DRAFT_CREATION", "CANCELLED"],
  APPROVED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED"],
  // Quality check can send work back to the press. That is the whole point of
  // having a quality check.
  QUALITY_CHECK: ["READY_FOR_RELEASE", "IN_PRODUCTION", "CANCELLED"],
  READY_FOR_RELEASE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrder(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionItem(
  from: OrderItemStatusValue,
  to: OrderItemStatusValue,
): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

export function isTerminalOrder(status: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export function isTerminalItem(status: OrderItemStatusValue): boolean {
  return ITEM_TRANSITIONS[status].length === 0;
}

/**
 * Thrown when a caller attempts an illegal move. Carries both statuses so the
 * message says what was actually attempted rather than "invalid transition".
 */
export class TransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cannot move from ${from} to ${to}.`);
    this.name = "TransitionError";
  }
}
