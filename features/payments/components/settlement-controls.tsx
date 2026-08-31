"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialSettlementState, recordSettlementAction } from "../actions";

export function SettlementControls({
  orderId,
  status,
  onlineAvailable,
  provider,
  providerReference,
}: {
  orderId: string;
  status: string | null;
  onlineAvailable: boolean;
  provider: string | null;
  providerReference: string | null;
}) {
  const [state, action] = useFormState(
    recordSettlementAction,
    initialSettlementState,
  );
  if (status === "CAPTURED" || status === "WAIVED") {
    return (
      <span className="text-xs font-medium">
        {status === "CAPTURED" ? "Paid" : "Waived"}
      </span>
    );
  }
  if (provider === "paymongo" && providerReference) {
    return (
      <div className="min-w-56 space-y-2">
        <p className="text-xs font-medium">Online checkout active</p>
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="kind" value="reset-online" />
          <Button size="sm" type="submit" variant="outline">
            Cancel checkout
          </Button>
        </form>
        {state.message ? (
          <p
            className={
              state.status === "error"
                ? "text-xs text-destructive"
                : "text-xs text-green-700"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="min-w-56 space-y-2">
      {onlineAvailable ? (
        <form action={action} className="flex gap-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="kind" value="online" />
          <Input
            name="amount"
            inputMode="decimal"
            placeholder="PHP amount"
            aria-label="Online payment amount in Philippine pesos"
            className="h-8"
          />
          <Button size="sm" type="submit">
            Send checkout
          </Button>
        </form>
      ) : null}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="kind" value="paid" />
        <Input
          name="amount"
          inputMode="decimal"
          placeholder="PHP amount"
          aria-label="Paid amount in Philippine pesos"
          className="h-8"
        />
        <Button size="sm" type="submit">
          Record paid
        </Button>
      </form>
      <form action={action} className="flex gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="kind" value="waived" />
        <Input
          name="reason"
          placeholder="Waiver reason"
          aria-label="Payment waiver reason"
          className="h-8"
        />
        <Button size="sm" type="submit" variant="outline">
          Waive
        </Button>
      </form>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-xs text-destructive"
              : "text-xs text-green-700"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
