import { describe, expect, it } from "vitest";
import {
  ORDER_TRANSITIONS,
  ITEM_TRANSITIONS,
  canTransitionOrder,
  canTransitionItem,
  isTerminalOrder,
  isTerminalItem,
} from "./status";
import type { OrderStatusValue, OrderItemStatusValue } from "./types";

describe("order transitions", () => {
  it("allows the documented forward path", () => {
    expect(canTransitionOrder("INQUIRY", "QUOTATION")).toBe(true);
    expect(canTransitionOrder("QUOTATION", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionOrder("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionOrder("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("rejects skipping straight from inquiry to completed", () => {
    expect(canTransitionOrder("INQUIRY", "COMPLETED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransitionOrder("CONFIRMED", "INQUIRY")).toBe(false);
  });

  it("allows cancelling from any non-terminal state", () => {
    for (const from of [
      "INQUIRY",
      "QUOTATION",
      "CONFIRMED",
      "IN_PROGRESS",
    ] as OrderStatusValue[]) {
      expect(canTransitionOrder(from, "CANCELLED")).toBe(true);
    }
  });

  it("lets nothing out of a terminal state", () => {
    for (const terminal of ["ARCHIVED", "CANCELLED"] as OrderStatusValue[]) {
      for (const to of Object.keys(ORDER_TRANSITIONS) as OrderStatusValue[]) {
        expect(canTransitionOrder(terminal, to)).toBe(false);
      }
    }
  });

  it("lets a completed order be archived and nothing else", () => {
    expect(canTransitionOrder("COMPLETED", "ARCHIVED")).toBe(true);
    for (const to of ["INQUIRY", "IN_PROGRESS", "CANCELLED"] as OrderStatusValue[]) {
      expect(canTransitionOrder("COMPLETED", to)).toBe(false);
    }
  });

  it("treats a status as unable to transition to itself", () => {
    expect(canTransitionOrder("CONFIRMED", "CONFIRMED")).toBe(false);
  });

  it("reports terminal states", () => {
    expect(isTerminalOrder("ARCHIVED")).toBe(true);
    expect(isTerminalOrder("CANCELLED")).toBe(true);
    expect(isTerminalOrder("IN_PROGRESS")).toBe(false);
  });
});

describe("item transitions", () => {
  it("allows the documented production path", () => {
    expect(canTransitionItem("PENDING", "DRAFT_CREATION")).toBe(true);
    expect(canTransitionItem("DRAFT_CREATION", "CUSTOMER_REVIEW")).toBe(true);
    expect(canTransitionItem("CUSTOMER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionItem("APPROVED", "IN_PRODUCTION")).toBe(true);
    expect(canTransitionItem("IN_PRODUCTION", "QUALITY_CHECK")).toBe(true);
    expect(canTransitionItem("QUALITY_CHECK", "READY_FOR_RELEASE")).toBe(true);
    expect(canTransitionItem("READY_FOR_RELEASE", "COMPLETED")).toBe(true);
  });

  it("sends a review rejection to REVISION and back to drafting", () => {
    expect(canTransitionItem("CUSTOMER_REVIEW", "REVISION")).toBe(true);
    expect(canTransitionItem("REVISION", "DRAFT_CREATION")).toBe(true);
  });

  it("lets quality check send work back into production", () => {
    expect(canTransitionItem("QUALITY_CHECK", "IN_PRODUCTION")).toBe(true);
  });

  it("rejects jumping past quality check", () => {
    expect(canTransitionItem("IN_PRODUCTION", "COMPLETED")).toBe(false);
  });

  it("rejects producing something that was never approved", () => {
    expect(canTransitionItem("CUSTOMER_REVIEW", "IN_PRODUCTION")).toBe(false);
  });

  it("allows cancelling from any non-terminal state", () => {
    for (const from of [
      "PENDING",
      "DRAFT_CREATION",
      "CUSTOMER_REVIEW",
      "REVISION",
      "APPROVED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "READY_FOR_RELEASE",
    ] as OrderItemStatusValue[]) {
      expect(canTransitionItem(from, "CANCELLED")).toBe(true);
    }
  });

  it("lets nothing out of a terminal state", () => {
    for (const terminal of [
      "COMPLETED",
      "CANCELLED",
    ] as OrderItemStatusValue[]) {
      for (const to of Object.keys(ITEM_TRANSITIONS) as OrderItemStatusValue[]) {
        expect(canTransitionItem(terminal, to)).toBe(false);
      }
    }
    expect(isTerminalItem("COMPLETED")).toBe(true);
    expect(isTerminalItem("PENDING")).toBe(false);
  });

  it("defines an entry for every status, so no status is a dead end by omission", () => {
    const all: OrderItemStatusValue[] = [
      "PENDING",
      "DRAFT_CREATION",
      "CUSTOMER_REVIEW",
      "REVISION",
      "APPROVED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "READY_FOR_RELEASE",
      "COMPLETED",
      "CANCELLED",
    ];
    for (const status of all) {
      expect(ITEM_TRANSITIONS[status]).toBeDefined();
    }
  });
});
