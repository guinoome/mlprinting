"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveItemAction,
  requestRevisionAction,
  initialOrderActionState,
} from "../actions";

/**
 * The approve / request-revision controls for one item awaiting review —
 * Ph7.md §6, §5. Rendered only for items in CUSTOMER_REVIEW; the server proves
 * that independently, so a stale page cannot approve something already moved on.
 */
function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}

function RevisionButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Sending…" : "Request changes"}
    </Button>
  );
}

export function ReviewControls({
  itemId,
  orderId,
}: {
  itemId: string;
  orderId: string;
}) {
  const [approveState, approve] = useFormState(
    approveItemAction,
    initialOrderActionState,
  );
  const [reviseState, revise] = useFormState(
    requestRevisionAction,
    initialOrderActionState,
  );

  return (
    <div className="space-y-4 border-t pt-4">
      <form action={approve} className="space-y-2">
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="orderId" value={orderId} />
        <ApproveButton />
        {approveState.status === "success" && approveState.message ? (
          <p className="text-sm text-green-700">{approveState.message}</p>
        ) : null}
        {approveState.status === "error" && approveState.message ? (
          <p className="text-destructive text-sm">{approveState.message}</p>
        ) : null}
      </form>

      <form action={revise} className="space-y-2">
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="orderId" value={orderId} />
        <label htmlFor={`revise-${itemId}`} className="text-sm font-medium">
          Or request changes
        </label>
        <Textarea
          id={`revise-${itemId}`}
          name="description"
          rows={3}
          placeholder="Tell us what you'd like changed."
          required
        />
        <RevisionButton />
        {reviseState.status === "success" && reviseState.message ? (
          <p className="text-sm text-green-700">{reviseState.message}</p>
        ) : null}
        {reviseState.status === "error" && reviseState.message ? (
          <p className="text-destructive text-sm">{reviseState.message}</p>
        ) : null}
      </form>
    </div>
  );
}
