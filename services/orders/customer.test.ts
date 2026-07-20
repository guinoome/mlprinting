import { describe, expect, it } from "vitest";
import { canCustomerReview, revisionNumberFrom } from "./customer";

describe("canCustomerReview", () => {
  it("is true only while an item is with the customer", () => {
    expect(canCustomerReview("CUSTOMER_REVIEW")).toBe(true);
  });

  it("is false everywhere else", () => {
    for (const status of [
      "PENDING",
      "DRAFT_CREATION",
      "REVISION",
      "APPROVED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "READY_FOR_RELEASE",
      "COMPLETED",
      "CANCELLED",
    ] as const) {
      expect(canCustomerReview(status)).toBe(false);
    }
  });
});

describe("revisionNumberFrom", () => {
  it("is one for an item that has never been revised", () => {
    expect(revisionNumberFrom(0)).toBe(1);
  });

  it("counts up from prior revisions", () => {
    expect(revisionNumberFrom(2)).toBe(3);
  });
});
