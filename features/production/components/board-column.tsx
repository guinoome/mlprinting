"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { moveItemAction, initialProductionState } from "../actions";
import { ITEM_TRANSITIONS } from "@/services/orders/status";
import type { OrderItemStatusValue } from "@/services/orders/types";
import { COLUMN_LABELS, type BoardColumn } from "../board";

const ALL_LABELS: Record<string, string> = {
  ...COLUMN_LABELS,
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Only the moves the transition table permits are offered. Rendering every
 * status and rejecting most of them on submit would teach staff to expect
 * failure; this is the same table the server enforces, so the menu cannot drift
 * from the rules.
 */
export function MoveControl({
  itemId,
  current,
}: {
  itemId: string;
  current: OrderItemStatusValue;
}) {
  const [state, formAction] = useFormState(
    moveItemAction,
    initialProductionState,
  );
  const allowed = ITEM_TRANSITIONS[current];

  if (allowed.length === 0) return null;

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="itemId" value={itemId} />
      <label className="sr-only" htmlFor={`move-${itemId}`}>
        Move this item
      </label>
      <select
        id={`move-${itemId}`}
        name="to"
        defaultValue=""
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="border-input bg-background h-8 w-full rounded border px-2 text-xs"
      >
        <option value="" disabled>
          Move to…
        </option>
        {allowed.map((status) => (
          <option key={status} value={status}>
            {ALL_LABELS[status] ?? status}
          </option>
        ))}
      </select>
      {state.status === "error" && state.message ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : null}
    </form>
  );
}

export function BoardColumnView({
  column,
  count,
  children,
}: {
  column: BoardColumn;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-muted/40 flex w-72 shrink-0 flex-col rounded-lg p-3">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{COLUMN_LABELS[column]}</h2>
        <span className="text-muted-foreground text-xs">{count}</span>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
