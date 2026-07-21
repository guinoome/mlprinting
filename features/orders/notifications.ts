/**
 * Customer notifications — Ph7.md §9.
 *
 * Derived from the customer's orders rather than stored in a table. A
 * notification here is "something about your order that wants your attention",
 * and every fact it reports already lives on the order — an item awaiting your
 * review, an order just completed. Deriving it means there is nothing to keep
 * in sync and no migration to ship; when §9's "extensible channels" (email,
 * SMS) arrive, they read the same derivation.
 *
 * Pure, so the rules for what counts as a notification are tested rather than
 * discovered in production.
 */

export type NotificationKind = "review" | "complete";

export interface CustomerNotification {
  kind: NotificationKind;
  orderId: string;
  reference: string;
  message: string;
}

interface OrderLike {
  id: string;
  reference: string;
  status: string;
  items: { kind: string; status: string }[];
}

const KIND_WORDS: Record<string, string> = {
  INVITATION_PRINT: "invitation",
  WEBSITE: "website",
  REPRINT: "reprint",
  OTHER: "order",
};

export function deriveCustomerNotifications(
  orders: readonly OrderLike[],
): CustomerNotification[] {
  const reviews: CustomerNotification[] = [];
  const completions: CustomerNotification[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (item.status === "CUSTOMER_REVIEW") {
        reviews.push({
          kind: "review",
          orderId: order.id,
          reference: order.reference,
          message: `Your ${KIND_WORDS[item.kind] ?? "order"} for ${order.reference} is ready to review.`,
        });
      }
    }

    if (order.status === "COMPLETED") {
      completions.push({
        kind: "complete",
        orderId: order.id,
        reference: order.reference,
        message: `Order ${order.reference} is complete.`,
      });
    }
  }

  // Actionable things first: a review needs a decision, a completion is just
  // good news.
  return [...reviews, ...completions];
}
