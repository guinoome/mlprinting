/**
 * Is this event's work actually delivered — Ph8 §10 (Delivery Validation),
 * which the Delivery Center in §8 reports on.
 *
 * Pure: no Prisma, no React. Delivery is the one judgement a customer will
 * argue with ("you said it was ready"), so the rules belong somewhere they can
 * be asserted rather than inferred from a page that happened to render a green
 * tick.
 *
 * The steps are deliberately in the order the work happens. A customer reading
 * this is asking one question — what is left — and a list that jumps around
 * answers it worse than a list that walks forward.
 */

export type DeliveryStepId =
  | "details"
  | "website"
  | "print"
  | "order"
  | "payment";

export type DeliveryStepState = "done" | "waiting" | "failed" | "not-required";

export interface DeliveryStep {
  id: DeliveryStepId;
  label: string;
  state: DeliveryStepState;
  /** One line the customer can act on. Never a status word repeated. */
  detail: string;
}

export interface DeliveryInput {
  invitation: {
    status: "DRAFT" | "COMPLETED" | "ARCHIVED";
    slug: string | null;
    isPublished: boolean;
    eventTitle: string | null;
  };
  /** Newest first. Only the newest decides the step; older ones are history. */
  pdfGenerations: { status: "PENDING" | "READY" | "FAILED" }[];
  order: { reference: string; status: string } | null;
  /**
   * Whether this deployment gates delivery on payment.
   *
   * False today, and not an oversight: Ph8's payment module is paused at the
   * owner's instruction, so there is nothing that could satisfy the gate. The
   * step is still declared and reported as not-required, because a delivery
   * checklist that silently omits payment reads as "payment is not part of
   * this" rather than "payment is not switched on" — and switching it on
   * should be this flag, not a new step somebody has to remember to add.
   */
  paymentRequired: boolean;
}

export interface DeliveryReadiness {
  steps: DeliveryStep[];
  /** Everything a customer is owed is available. */
  delivered: boolean;
  /** Something went wrong and will not fix itself. */
  attention: boolean;
  /** The one thing to do next, or null when there is nothing to do. */
  nextStep: DeliveryStep | null;
}

/** The newest generation decides; a superseded failure is not a live problem. */
function printState(
  generations: DeliveryInput["pdfGenerations"],
): DeliveryStepState {
  const latest = generations[0];
  if (!latest) return "waiting";
  if (latest.status === "READY") return "done";
  if (latest.status === "FAILED") return "failed";
  return "waiting";
}

export function deliveryReadiness(input: DeliveryInput): DeliveryReadiness {
  const { invitation, order } = input;

  const detailsDone = invitation.status !== "DRAFT";
  const websiteDone = invitation.isPublished && Boolean(invitation.slug);
  const print = printState(input.pdfGenerations);

  const steps: DeliveryStep[] = [
    {
      id: "details",
      label: "Event details",
      state: detailsDone ? "done" : "waiting",
      detail: detailsDone
        ? "Your details are complete."
        : "Finish the builder to lock in your details.",
    },
    {
      id: "website",
      label: "Invitation website",
      state: websiteDone ? "done" : "waiting",
      detail: websiteDone
        ? "Live and ready to share."
        : invitation.slug
          ? "Ready to publish whenever you are."
          : "Choose a web address, then publish.",
    },
    {
      id: "print",
      label: "Print file",
      state: print,
      detail:
        print === "done"
          ? "Your print-ready PDF is available to download."
          : print === "failed"
            ? "The last attempt did not finish. Generate it again, or contact us."
            : input.pdfGenerations.length === 0
              ? "Not generated yet."
              : "Generating — this usually takes a moment.",
    },
    {
      id: "order",
      label: "Order",
      state: order ? "done" : "waiting",
      detail: order
        ? `Order ${order.reference} — ${order.status.toLowerCase().replace(/_/g, " ")}.`
        : "No order placed yet.",
    },
    {
      id: "payment",
      label: "Payment",
      state: input.paymentRequired ? "waiting" : "not-required",
      detail: input.paymentRequired
        ? "Awaiting payment."
        : "Not required for this order.",
    },
  ];

  // "not-required" counts as satisfied. A step nobody has to do cannot be the
  // reason a finished invitation is reported as unfinished.
  const outstanding = steps.filter(
    (s) => s.state !== "done" && s.state !== "not-required",
  );

  return {
    steps,
    delivered: outstanding.length === 0,
    attention: steps.some((s) => s.state === "failed"),
    // A failure is what to deal with first even when it sits later in the list.
    nextStep:
      outstanding.find((s) => s.state === "failed") ?? outstanding[0] ?? null,
  };
}
