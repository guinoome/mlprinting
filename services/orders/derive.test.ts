import { describe, expect, it } from "vitest";
import { deriveOrderStatus } from "./derive";

describe("deriveOrderStatus", () => {
  it("returns null when nothing should change", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["DRAFT_CREATION"])).toBeNull();
  });

  it("moves a confirmed order to in-progress once work starts", () => {
    expect(deriveOrderStatus("CONFIRMED", ["DRAFT_CREATION"])).toBe(
      "IN_PROGRESS",
    );
  });

  it("leaves a confirmed order alone while every item is still pending", () => {
    expect(deriveOrderStatus("CONFIRMED", ["PENDING", "PENDING"])).toBeNull();
  });

  it("completes an order once every item is complete", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "COMPLETED"])).toBe(
      "COMPLETED",
    );
  });

  it("treats cancelled items as not blocking completion", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "CANCELLED"])).toBe(
      "COMPLETED",
    );
  });

  it("does not complete an order while any item is still in flight", () => {
    expect(
      deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "QUALITY_CHECK"]),
    ).toBeNull();
  });

  it("does not complete an order with no items at all", () => {
    // An order with nothing on it is not a finished order — it is an empty one.
    expect(deriveOrderStatus("IN_PROGRESS", [])).toBeNull();
  });

  it("does not complete an order whose every item was cancelled", () => {
    // Everything cancelled means the job was called off, not delivered.
    expect(
      deriveOrderStatus("IN_PROGRESS", ["CANCELLED", "CANCELLED"]),
    ).toBeNull();
  });

  it("never resurrects a terminal order", () => {
    expect(deriveOrderStatus("CANCELLED", ["COMPLETED"])).toBeNull();
    expect(deriveOrderStatus("ARCHIVED", ["COMPLETED"])).toBeNull();
    expect(deriveOrderStatus("COMPLETED", ["IN_PRODUCTION"])).toBeNull();
  });

  it("never derives a move the transition table forbids", () => {
    // INQUIRY -> IN_PROGRESS is not a legal edge, so starting work on an item
    // of an un-quoted order must not silently advance it.
    expect(deriveOrderStatus("INQUIRY", ["DRAFT_CREATION"])).toBeNull();
  });
});
