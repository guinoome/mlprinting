import type { PublicationDecision, PaymentStatusValue } from "./types";

const PAYMENT_TRANSITIONS: Record<
  PaymentStatusValue,
  readonly PaymentStatusValue[]
> = {
  PENDING: ["AUTHORIZED", "CAPTURED", "FAILED"],
  AUTHORIZED: ["CAPTURED", "FAILED"],
  CAPTURED: ["REFUNDED"],
  FAILED: ["PENDING", "AUTHORIZED", "CAPTURED"],
  REFUNDED: [],
  WAIVED: [],
};

export function canTransitionPayment(
  from: PaymentStatusValue,
  to: PaymentStatusValue,
) {
  return from === to || PAYMENT_TRANSITIONS[from].includes(to);
}

const APPROVED_WEBSITE_STATES = new Set([
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
  "COMPLETED",
]);

export function paymentSatisfiesPublication(
  status: PaymentStatusValue | null,
): boolean {
  return status === "CAPTURED" || status === "WAIVED";
}

export function decidePublication(input: {
  invitationStatus: string;
  order: {
    id: string;
    items: { kind: string; status: string }[];
    payment: { status: PaymentStatusValue } | null;
  } | null;
}): PublicationDecision {
  if (input.invitationStatus !== "COMPLETED") {
    return {
      allowed: false,
      code: "INCOMPLETE",
      reason: "Finish the invitation before publishing it.",
    };
  }
  if (!input.order) {
    return {
      allowed: false,
      code: "NO_ORDER",
      reason: "Create an order for this invitation before publishing it.",
    };
  }
  const websiteItems = input.order.items.filter(
    (item) => item.kind === "WEBSITE",
  );
  if (websiteItems.length === 0) {
    return {
      allowed: false,
      code: "NO_WEBSITE_ITEM",
      reason: "Add the invitation website to the order before publishing it.",
    };
  }
  if (websiteItems.some((item) => !APPROVED_WEBSITE_STATES.has(item.status))) {
    return {
      allowed: false,
      code: "NOT_APPROVED",
      reason: "Approve the website proof before publishing it.",
    };
  }
  if (!paymentSatisfiesPublication(input.order.payment?.status ?? null)) {
    return {
      allowed: false,
      code: "NOT_PAID",
      reason:
        "Verified payment or a staff-approved waiver is required before publishing.",
    };
  }
  return { allowed: true, orderId: input.order.id };
}
