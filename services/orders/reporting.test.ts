import { describe, expect, it } from "vitest";
import { summarise, ACTIVE_ORDER_STATUSES } from "./reporting";

describe("summarise", () => {
  it("counts active bookings, excluding finished and abandoned ones", () => {
    const report = summarise({
      orderStatusCounts: {
        INQUIRY: 2,
        CONFIRMED: 3,
        IN_PROGRESS: 4,
        COMPLETED: 5,
        ARCHIVED: 1,
        CANCELLED: 2,
      },
      itemStatusCounts: {},
    });
    // active = INQUIRY+QUOTATION+CONFIRMED+IN_PROGRESS = 2+0+3+4 = 9
    expect(report.activeBookings).toBe(9);
  });

  it("reports pending approvals from items with the customer", () => {
    const report = summarise({
      orderStatusCounts: {},
      itemStatusCounts: { CUSTOMER_REVIEW: 6, IN_PRODUCTION: 2 },
    });
    expect(report.pendingApprovals).toBe(6);
  });

  it("counts production workload as items actively being worked", () => {
    const report = summarise({
      orderStatusCounts: {},
      itemStatusCounts: {
        DRAFT_CREATION: 1,
        IN_PRODUCTION: 2,
        QUALITY_CHECK: 3,
        READY_FOR_RELEASE: 1,
        COMPLETED: 9,
        CANCELLED: 4,
        PENDING: 5,
      },
    });
    // workload = everything not PENDING, COMPLETED or CANCELLED = 1+2+3+1 = 7
    expect(report.productionWorkload).toBe(7);
  });

  it("passes the per-status order counts through for display", () => {
    const report = summarise({
      orderStatusCounts: { CONFIRMED: 3 },
      itemStatusCounts: {},
    });
    expect(report.ordersByStatus.CONFIRMED).toBe(3);
    // a status not present reads as zero, not undefined
    expect(report.ordersByStatus.INQUIRY).toBe(0);
  });

  it("is all zeros for an empty shop", () => {
    const report = summarise({ orderStatusCounts: {}, itemStatusCounts: {} });
    expect(report.activeBookings).toBe(0);
    expect(report.pendingApprovals).toBe(0);
    expect(report.productionWorkload).toBe(0);
    expect(report.completedOrders).toBe(0);
  });
});

describe("ACTIVE_ORDER_STATUSES", () => {
  it("is the non-terminal commercial states", () => {
    expect(ACTIVE_ORDER_STATUSES).toEqual([
      "INQUIRY",
      "QUOTATION",
      "CONFIRMED",
      "IN_PROGRESS",
    ]);
  });
});
