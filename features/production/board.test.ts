import { describe, expect, it } from "vitest";
import { BOARD_COLUMNS, groupIntoColumns, sortForBoard } from "./board";
import type { OrderItemStatusValue, PriorityValue } from "@/services/orders/types";

interface Item {
  id: string;
  status: OrderItemStatusValue;
  priority: PriorityValue;
  dueDate: Date | null;
}

function item(over: Partial<Item> = {}): Item {
  return {
    id: "i1",
    status: "PENDING",
    priority: "NORMAL",
    dueDate: null,
    ...over,
  };
}

describe("BOARD_COLUMNS", () => {
  it("does not show finished or abandoned work", () => {
    expect(BOARD_COLUMNS).not.toContain("COMPLETED");
    expect(BOARD_COLUMNS).not.toContain("CANCELLED");
  });

  it("runs in production order", () => {
    expect(BOARD_COLUMNS[0]).toBe("PENDING");
    expect(BOARD_COLUMNS[BOARD_COLUMNS.length - 1]).toBe("READY_FOR_RELEASE");
  });
});

describe("groupIntoColumns", () => {
  it("returns an entry for every column, even empty ones", () => {
    const grouped = groupIntoColumns([]);
    for (const column of BOARD_COLUMNS) {
      expect(grouped[column]).toEqual([]);
    }
  });

  it("files each item under its own status", () => {
    const grouped = groupIntoColumns([
      item({ id: "a", status: "PENDING" }),
      item({ id: "b", status: "IN_PRODUCTION" }),
    ]);
    expect(grouped.PENDING.map((i) => i.id)).toEqual(["a"]);
    expect(grouped.IN_PRODUCTION.map((i) => i.id)).toEqual(["b"]);
  });

  it("drops items whose status is not a board column", () => {
    // A completed item is not board work. Silently binning it beats crashing
    // the whole board over one row.
    const grouped = groupIntoColumns([
      item({ id: "done", status: "COMPLETED" }),
    ]);
    for (const column of BOARD_COLUMNS) {
      expect(grouped[column]).toEqual([]);
    }
  });
});

describe("sortForBoard", () => {
  it("puts urgent work first", () => {
    const sorted = sortForBoard([
      item({ id: "low", priority: "LOW" }),
      item({ id: "urgent", priority: "URGENT" }),
      item({ id: "normal", priority: "NORMAL" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["urgent", "normal", "low"]);
  });

  it("breaks ties on the earlier due date", () => {
    const sorted = sortForBoard([
      item({ id: "later", dueDate: new Date("2027-03-20") }),
      item({ id: "sooner", dueDate: new Date("2027-03-14") }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["sooner", "later"]);
  });

  it("puts undated work after dated work at the same priority", () => {
    // Something with a deadline outranks something without one.
    const sorted = sortForBoard([
      item({ id: "undated", dueDate: null }),
      item({ id: "dated", dueDate: new Date("2027-03-14") }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["dated", "undated"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [
      item({ id: "low", priority: "LOW" }),
      item({ id: "urgent", priority: "URGENT" }),
    ];
    sortForBoard(input);
    expect(input.map((i) => i.id)).toEqual(["low", "urgent"]);
  });
});
