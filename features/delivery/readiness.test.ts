import { describe, expect, it } from "vitest";
import { deliveryReadiness, type DeliveryInput } from "./readiness";

const base: DeliveryInput = {
  invitation: {
    status: "COMPLETED",
    slug: "maria-and-jose",
    isPublished: true,
    eventTitle: "Maria & Jose",
  },
  pdfGenerations: [{ status: "READY" }],
  order: { reference: "ML-0001", status: "IN_PROGRESS" },
  paymentRequired: false,
};

const stepOf = (input: DeliveryInput, id: string) =>
  deliveryReadiness(input).steps.find((s) => s.id === id)!;

describe("deliveryReadiness", () => {
  it("reports delivered when everything is in place", () => {
    const result = deliveryReadiness(base);
    expect(result.delivered).toBe(true);
    expect(result.attention).toBe(false);
    expect(result.nextStep).toBeNull();
  });

  it("always reports the same five steps, in the order work happens", () => {
    expect(deliveryReadiness(base).steps.map((s) => s.id)).toEqual([
      "details",
      "website",
      "print",
      "order",
      "payment",
    ]);
  });

  describe("website", () => {
    it("is not done until it is both published and addressable", () => {
      expect(
        stepOf(
          { ...base, invitation: { ...base.invitation, isPublished: false } },
          "website",
        ).state,
      ).toBe("waiting");

      // isPublished with no slug is a state the builder should not produce, and
      // if it ever does, "live" would be a lie — there is no URL to visit.
      expect(
        stepOf(
          { ...base, invitation: { ...base.invitation, slug: null } },
          "website",
        ).state,
      ).toBe("waiting");
    });

    it("tells an unpublished customer which of the two things to do", () => {
      const noSlug = stepOf(
        { ...base, invitation: { ...base.invitation, slug: null, isPublished: false } },
        "website",
      );
      expect(noSlug.detail).toContain("address");

      const hasSlug = stepOf(
        { ...base, invitation: { ...base.invitation, isPublished: false } },
        "website",
      );
      expect(hasSlug.detail).toContain("publish");
    });
  });

  describe("print", () => {
    it("waits when nothing has been generated", () => {
      expect(stepOf({ ...base, pdfGenerations: [] }, "print").state).toBe(
        "waiting",
      );
    });

    it("waits while a generation is pending", () => {
      expect(
        stepOf({ ...base, pdfGenerations: [{ status: "PENDING" }] }, "print")
          .state,
      ).toBe("waiting");
    });

    it("fails when the newest attempt failed", () => {
      const result = deliveryReadiness({
        ...base,
        pdfGenerations: [{ status: "FAILED" }],
      });
      expect(result.attention).toBe(true);
      expect(result.delivered).toBe(false);
    });

    /**
     * Generations are appended, never overwritten (Ph6 §12), so a customer who
     * hit a failure and regenerated has a FAILED row forever. Judging on the
     * newest is what stops a solved problem being reported as a live one.
     */
    it("ignores a failure that a later attempt superseded", () => {
      const result = deliveryReadiness({
        ...base,
        pdfGenerations: [{ status: "READY" }, { status: "FAILED" }],
      });
      expect(stepOf({ ...base, pdfGenerations: [{ status: "READY" }, { status: "FAILED" }] }, "print").state).toBe("done");
      expect(result.attention).toBe(false);
      expect(result.delivered).toBe(true);
    });
  });

  describe("payment", () => {
    /**
     * Payments are paused at the owner's instruction, so nothing can satisfy
     * the gate. The step is still reported — a checklist that omits payment
     * reads as "payment is not part of this" rather than "payment is off".
     */
    it("is declared but inert while payments are paused", () => {
      const step = stepOf(base, "payment");
      expect(step.state).toBe("not-required");
      expect(deliveryReadiness(base).delivered).toBe(true);
    });

    it("blocks delivery the moment it is switched on", () => {
      const result = deliveryReadiness({ ...base, paymentRequired: true });
      expect(result.delivered).toBe(false);
      expect(result.nextStep?.id).toBe("payment");
    });
  });

  describe("nextStep", () => {
    it("names the earliest outstanding step", () => {
      const result = deliveryReadiness({
        ...base,
        invitation: { ...base.invitation, status: "DRAFT", isPublished: false },
      });
      expect(result.nextStep?.id).toBe("details");
    });

    it("prefers a failure over an earlier merely-waiting step", () => {
      // A failure will not fix itself; a waiting step often will.
      const result = deliveryReadiness({
        ...base,
        invitation: { ...base.invitation, isPublished: false },
        pdfGenerations: [{ status: "FAILED" }],
      });
      expect(result.nextStep?.id).toBe("print");
    });
  });

  it("never claims delivered while a step is outstanding", () => {
    const permutations: DeliveryInput[] = [
      { ...base, invitation: { ...base.invitation, status: "DRAFT" } },
      { ...base, invitation: { ...base.invitation, isPublished: false } },
      { ...base, pdfGenerations: [] },
      { ...base, pdfGenerations: [{ status: "FAILED" }] },
      { ...base, order: null },
      { ...base, paymentRequired: true },
    ];
    for (const input of permutations) {
      const result = deliveryReadiness(input);
      expect(result.delivered, JSON.stringify(input.invitation)).toBe(false);
      expect(result.nextStep).not.toBeNull();
    }
  });
});
