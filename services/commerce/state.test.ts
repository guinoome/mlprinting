import { describe, expect, it } from "vitest";
import {
  canTransitionPayment,
  decidePublication,
  paymentSatisfiesPublication,
} from "./state";

const ready = {
  invitationStatus: "COMPLETED",
  order: {
    id: "order-1",
    items: [{ kind: "WEBSITE", status: "APPROVED" }],
    payment: { status: "CAPTURED" as const },
  },
};

describe("controlled publication", () => {
  it("requires completion, a website order item, approval, and settlement", () => {
    expect(decidePublication(ready)).toEqual({
      allowed: true,
      orderId: "order-1",
    });
    expect(
      decidePublication({ ...ready, invitationStatus: "DRAFT" }),
    ).toMatchObject({ code: "INCOMPLETE" });
    expect(decidePublication({ ...ready, order: null })).toMatchObject({
      code: "NO_ORDER",
    });
    expect(
      decidePublication({ ...ready, order: { ...ready.order, items: [] } }),
    ).toMatchObject({ code: "NO_WEBSITE_ITEM" });
    expect(
      decidePublication({
        ...ready,
        order: {
          ...ready.order,
          items: [{ kind: "WEBSITE", status: "CUSTOMER_REVIEW" }],
        },
      }),
    ).toMatchObject({ code: "NOT_APPROVED" });
    expect(
      decidePublication({
        ...ready,
        order: { ...ready.order, payment: { status: "AUTHORIZED" } },
      }),
    ).toMatchObject({ code: "NOT_PAID" });
  });

  it("accepts only captured or explicitly waived settlements", () => {
    expect(paymentSatisfiesPublication("CAPTURED")).toBe(true);
    expect(paymentSatisfiesPublication("WAIVED")).toBe(true);
    for (const status of [
      "PENDING",
      "AUTHORIZED",
      "FAILED",
      "REFUNDED",
    ] as const) {
      expect(paymentSatisfiesPublication(status)).toBe(false);
    }
  });

  it("allows verified capture and refund progress without reopening terminal states", () => {
    expect(canTransitionPayment("PENDING", "AUTHORIZED")).toBe(true);
    expect(canTransitionPayment("AUTHORIZED", "CAPTURED")).toBe(true);
    expect(canTransitionPayment("CAPTURED", "REFUNDED")).toBe(true);
    expect(canTransitionPayment("REFUNDED", "CAPTURED")).toBe(false);
    expect(canTransitionPayment("WAIVED", "CAPTURED")).toBe(false);
  });
});
