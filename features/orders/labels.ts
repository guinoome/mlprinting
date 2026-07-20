import type { OrderStatusValue, OrderItemStatusValue } from "@/services/orders";

/**
 * Customer-facing status wording — Ph7.md §3. Deliberately warmer and vaguer
 * than the internal enum: a customer does not need to know the difference
 * between QUALITY_CHECK and READY_FOR_RELEASE, only that their order is moving.
 */

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  INQUIRY: "Inquiry",
  QUOTATION: "Quotation sent",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

export const ITEM_STATUS_LABELS: Record<OrderItemStatusValue, string> = {
  PENDING: "Not started",
  DRAFT_CREATION: "Being designed",
  CUSTOMER_REVIEW: "Awaiting your review",
  REVISION: "Being revised",
  APPROVED: "Approved",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  READY_FOR_RELEASE: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ITEM_KIND_LABELS: Record<string, string> = {
  INVITATION_PRINT: "Invitation print",
  WEBSITE: "Event website",
  REPRINT: "Reprint",
  OTHER: "Other",
};
