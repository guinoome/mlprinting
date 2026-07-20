import {
  PRIORITY_ORDER,
  type OrderItemStatusValue,
  type PriorityValue,
} from "@/services/orders/types";

/**
 * Board shape — Ph7.md §4, §10.
 *
 * Pure, and deliberately structural rather than visual: column membership and
 * ordering are decisions worth testing, and testing them through a rendered
 * component would be slower and prove less.
 *
 * This is the one module that imports `services/orders/types` directly instead
 * of the barrel. The barrel re-exports the repository, so reaching it would
 * pull Prisma into a module whose entire job is arranging plain objects — and
 * would make these tests need a database to check a sort order. `types.ts` is
 * shared vocabulary, not an internal, so the boundary the barrel protects is
 * not the one being crossed here.
 */

/**
 * COMPLETED and CANCELLED are absent on purpose. The board is a queue of work
 * to do; finished and abandoned items belong to the order's history, and
 * leaving them here would grow a column nobody ever clears.
 */
export const BOARD_COLUMNS = [
  "PENDING",
  "DRAFT_CREATION",
  "CUSTOMER_REVIEW",
  "REVISION",
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
] as const satisfies readonly OrderItemStatusValue[];

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const COLUMN_LABELS: Record<BoardColumn, string> = {
  PENDING: "Not started",
  DRAFT_CREATION: "Drafting",
  CUSTOMER_REVIEW: "With customer",
  REVISION: "Revising",
  APPROVED: "Approved",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  READY_FOR_RELEASE: "Ready",
};

interface Sortable {
  id: string;
  status: OrderItemStatusValue;
  priority: PriorityValue;
  dueDate: Date | null;
}

/** Urgent first, then the nearest deadline, then undated work. */
export function sortForBoard<T extends Sortable>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;

    // A deadline outranks no deadline; two undated items keep their order.
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

export function groupIntoColumns<T extends Sortable>(
  items: readonly T[],
): Record<BoardColumn, T[]> {
  const grouped = Object.fromEntries(
    BOARD_COLUMNS.map((column) => [column, [] as T[]]),
  ) as Record<BoardColumn, T[]>;

  for (const item of items) {
    const column = grouped[item.status as BoardColumn];
    // An item whose status is not a column (completed, cancelled) is simply not
    // board work. Dropping it beats crashing the board over one row.
    if (column) column.push(item);
  }

  for (const column of BOARD_COLUMNS) {
    grouped[column] = sortForBoard(grouped[column]);
  }

  return grouped;
}
