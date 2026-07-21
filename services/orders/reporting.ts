import type { OrderStatusValue, OrderItemStatusValue } from "./types";

/**
 * Reporting foundation — Ph7.md §14. Operational counts only; business
 * analytics belong to a later phase.
 *
 * The shaping is pure: it takes raw per-status counts (which the repository
 * gets cheaply from a groupBy) and turns them into the handful of numbers an
 * operator actually watches. Keeping it pure means every definition —
 * "active", "workload" — is pinned by a test rather than buried in a query.
 */

/** Non-terminal commercial states — an order still needing attention. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatusValue[] = [
  "INQUIRY",
  "QUOTATION",
  "CONFIRMED",
  "IN_PROGRESS",
];

/** Item states that represent work actively in the shop's hands. */
const WORKLOAD_ITEM_STATUSES: readonly OrderItemStatusValue[] = [
  "DRAFT_CREATION",
  "REVISION",
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
];

export type StatusCounts<T extends string> = Partial<Record<T, number>>;

export interface ReportInput {
  orderStatusCounts: StatusCounts<OrderStatusValue>;
  itemStatusCounts: StatusCounts<OrderItemStatusValue>;
}

export interface OrderReport {
  activeBookings: number;
  pendingApprovals: number;
  productionWorkload: number;
  completedOrders: number;
  ordersByStatus: Record<OrderStatusValue, number>;
}

const ALL_ORDER_STATUSES: readonly OrderStatusValue[] = [
  "INQUIRY",
  "QUOTATION",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
];

function sum<T extends string>(
  counts: StatusCounts<T>,
  keys: readonly T[],
): number {
  return keys.reduce((total, key) => total + (counts[key] ?? 0), 0);
}

export function summarise(input: ReportInput): OrderReport {
  const ordersByStatus = Object.fromEntries(
    ALL_ORDER_STATUSES.map((status) => [
      status,
      input.orderStatusCounts[status] ?? 0,
    ]),
  ) as Record<OrderStatusValue, number>;

  return {
    activeBookings: sum(input.orderStatusCounts, ACTIVE_ORDER_STATUSES),
    pendingApprovals: input.itemStatusCounts.CUSTOMER_REVIEW ?? 0,
    productionWorkload: sum(input.itemStatusCounts, WORKLOAD_ITEM_STATUSES),
    completedOrders: input.orderStatusCounts.COMPLETED ?? 0,
    ordersByStatus,
  };
}
