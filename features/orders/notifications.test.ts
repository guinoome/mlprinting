import { describe, expect, it } from "vitest";
import { deriveCustomerNotifications } from "./notifications";

function order(over: Record<string, unknown> = {}) {
  return {
    id: "o1",
    reference: "ML-2026-0001",
    status: "IN_PROGRESS",
    items: [] as { kind: string; status: string }[],
    ...over,
  };
}

describe("deriveCustomerNotifications", () => {
  it("is empty when nothing needs the customer", () => {
    expect(deriveCustomerNotifications([order()])).toEqual([]);
  });

  it("raises one 'ready to review' per item awaiting review", () => {
    const notes = deriveCustomerNotifications([
      order({
        items: [
          { kind: "INVITATION_PRINT", status: "CUSTOMER_REVIEW" },
          { kind: "WEBSITE", status: "CUSTOMER_REVIEW" },
          { kind: "REPRINT", status: "IN_PRODUCTION" },
        ],
      }),
    ]);
    expect(notes).toHaveLength(2);
    expect(notes.every((n) => n.kind === "review")).toBe(true);
    expect(notes[0].orderId).toBe("o1");
  });

  it("announces a completed order once", () => {
    const notes = deriveCustomerNotifications([
      order({ status: "COMPLETED", items: [{ kind: "INVITATION_PRINT", status: "COMPLETED" }] }),
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("complete");
  });

  it("puts review requests before completion notes", () => {
    const notes = deriveCustomerNotifications([
      order({ id: "done", status: "COMPLETED", items: [{ kind: "WEBSITE", status: "COMPLETED" }] }),
      order({ id: "review", items: [{ kind: "INVITATION_PRINT", status: "CUSTOMER_REVIEW" }] }),
    ]);
    expect(notes[0].kind).toBe("review");
  });
});
