export type PaymentStatusValue =
  "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED" | "WAIVED";

export type PublicationDecision =
  | { allowed: true; orderId: string }
  | {
      allowed: false;
      code:
        | "INCOMPLETE"
        | "NO_ORDER"
        | "NO_WEBSITE_ITEM"
        | "NOT_APPROVED"
        | "NOT_PAID";
      reason: string;
    };

export interface VerifiedPaymentEvent {
  provider: string;
  providerReference: string;
  orderId: string;
  status: PaymentStatusValue;
  amountMinor: number;
  currency: string;
  verifiedAt: Date;
}

export interface PaymentProvider {
  readonly id: string;
  verify(input: {
    body: string;
    signature: string;
  }): Promise<VerifiedPaymentEvent | null>;
}
