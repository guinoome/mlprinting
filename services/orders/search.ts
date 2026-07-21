import type { Prisma } from "@prisma/client";
import type { OrderStatusValue } from "./types";

/**
 * Order search and filtering — Ph7.md §13.
 *
 * Pure: parsing raw params and building the WHERE clause are separated from the
 * database, so the whole filter surface is unit-testable — the same shape as
 * features/template-marketplace/criteria.ts and query.ts.
 */

const VALID_STATUSES: readonly OrderStatusValue[] = [
  "INQUIRY",
  "QUOTATION",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
];

export interface OrderSearchCriteria {
  q: string;
  status: OrderStatusValue[];
}

/** Accepts a value as a comma list or as repeated query params. */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : value.split(",");
  return raw.map((entry) => entry.trim()).filter(Boolean);
}

export function parseOrderSearch(params: {
  q?: string | string[];
  status?: string | string[];
}): OrderSearchCriteria {
  const q = (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim();

  const status = [...new Set(toList(params.status))].filter(
    (value): value is OrderStatusValue =>
      (VALID_STATUSES as readonly string[]).includes(value),
  );

  return { q, status };
}

export function buildOrderSearchWhere(
  criteria: OrderSearchCriteria,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (criteria.q) {
    const contains = { contains: criteria.q, mode: "insensitive" as const };
    where.OR = [
      { reference: contains },
      { profile: { displayName: contains } },
      { profile: { email: contains } },
    ];
  }

  if (criteria.status.length > 0) {
    where.status = { in: criteria.status };
  }

  return where;
}
