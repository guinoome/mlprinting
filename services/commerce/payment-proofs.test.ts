import { describe, expect, it } from "vitest";
import { paymentProofKind, paymentProofPath } from "./payment-proofs";

describe("payment proof validation", () => {
  it("accepts supported receipt images and PDFs", () => {
    expect(
      paymentProofKind({ name: "receipt.jpg", size: 2048, type: "image/jpeg" }),
    ).toBe("image");
    expect(
      paymentProofKind({ name: "receipt.pdf", size: 4096, type: "application/pdf" }),
    ).toBe("document");
  });

  it("rejects executable, mismatched, empty, and oversized evidence", () => {
    expect(
      paymentProofKind({ name: "receipt.exe", size: 2048, type: "application/octet-stream" }),
    ).toBeNull();
    expect(
      paymentProofKind({ name: "receipt.pdf", size: 2048, type: "image/jpeg" }),
    ).toBeNull();
    expect(
      paymentProofKind({ name: "receipt.png", size: 0, type: "image/png" }),
    ).toBeNull();
    expect(
      paymentProofKind({ name: "receipt.png", size: 4 * 1024 * 1024 + 1, type: "image/png" }),
    ).toBeNull();
  });

  it("keeps receipt objects within the authenticated owner's prefix", () => {
    expect(
      paymentProofPath({
        profileId: "owner-id",
        orderId: "order-id",
        proofId: "proof-id",
        filename: "receipt.PDF",
      }),
    ).toBe("owner-id/payment-proofs/order-id/proof-id.pdf");
  });
});
