"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  initialPaymentProofActionState,
  submitPaymentProofAction,
} from "../proof-actions";

const PAYMENT_PROOF_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.pdf";

export function PaymentProofUpload({ orderId }: { orderId: string }) {
  const [state, action] = useFormState(
    submitPaymentProofAction,
    initialPaymentProofActionState,
  );
  return (
    <form action={action} className="mt-5 space-y-3 rounded-xl border bg-muted/20 p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor={`receipt-${orderId}`} className="text-sm font-medium">
          Upload payment receipt
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP, HEIC, or PDF, up to 4 MB. Your proof stays private and is visible only to you and authorized staff.
        </p>
      </div>
      <Input
        id={`receipt-${orderId}`}
        name="receipt"
        type="file"
        accept={PAYMENT_PROOF_ACCEPT}
        required
      />
      <Input name="note" placeholder="Reference number or note (optional)" maxLength={500} />
      <Button type="submit">Send receipt for verification</Button>
      {state.message ? (
        <p
          className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-green-700"}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
