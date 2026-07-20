/**
 * Shared order types. Deliberately no Prisma import: the transition rules and
 * the board grouping must be testable without a database, and mirroring the
 * enums as string unions is what allows that.
 *
 * These unions must match prisma/schema.prisma exactly. A value here that the
 * database does not have is a runtime failure no type-checker will catch.
 */

export type OrderStatusValue =
  | "INQUIRY"
  | "QUOTATION"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELLED";

export type OrderItemStatusValue =
  | "PENDING"
  | "DRAFT_CREATION"
  | "CUSTOMER_REVIEW"
  | "REVISION"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "READY_FOR_RELEASE"
  | "COMPLETED"
  | "CANCELLED";

export type OrderItemKindValue =
  | "INVITATION_PRINT"
  | "WEBSITE"
  | "REPRINT"
  | "OTHER";

export type PriorityValue = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** Highest first — the board sorts on this. */
export const PRIORITY_ORDER: Record<PriorityValue, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};
