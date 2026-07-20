import type { OrderStatusValue, OrderItemStatusValue } from "./types";
import { canTransitionOrder } from "./status";

/**
 * An order's status follows its items, so nobody has to maintain it by hand —
 * spec, "Transitions". Derived on write rather than by a background job: a
 * board that shows yesterday's truth is worse than one that shows none.
 *
 * Returns the status to move to, or null to leave it alone. Returning null
 * rather than the current status keeps the caller's intent obvious: null means
 * "write nothing", which also means "write no audit event".
 *
 * Every derived move is checked against the same transition table a human move
 * goes through. A derivation that bypassed the rules would be a second, quieter
 * way to reach an illegal state.
 */
export function deriveOrderStatus(
  current: OrderStatusValue,
  itemStatuses: readonly OrderItemStatusValue[],
): OrderStatusValue | null {
  const propose = (next: OrderStatusValue): OrderStatusValue | null =>
    canTransitionOrder(current, next) ? next : null;

  if (itemStatuses.length === 0) return null;

  const live = itemStatuses.filter((status) => status !== "CANCELLED");

  // Everything cancelled: the job was called off, not delivered. Cancelling the
  // order itself is a decision a person makes, not one derived from items.
  if (live.length === 0) return null;

  if (live.every((status) => status === "COMPLETED")) return propose("COMPLETED");

  // Work has started the moment any item leaves PENDING.
  if (live.some((status) => status !== "PENDING")) return propose("IN_PROGRESS");

  return null;
}
