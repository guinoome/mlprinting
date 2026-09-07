"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  initialPaymentProofActionState,
  reviewPaymentProofAction,
} from "../proof-actions";

export function PaymentProofReview({
  proof,
}: {
  proof: { id: string; originalFilename: string; createdAt: Date };
}) {
  const [state, action] = useFormState(
    reviewPaymentProofAction,
    initialPaymentProofActionState,
  );
  return (
    <form action={action} className="mt-3 min-w-64 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-slate-900">
      <input type="hidden" name="proofId" value={proof.id} />
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Receipt awaiting review</p>
      <Link href={`/api/payments/proofs/${proof.id}`} target="_blank" className="block truncate text-xs underline">
        View {proof.originalFilename}
      </Link>
      <Input name="amount" inputMode="decimal" placeholder="Verified PHP amount" className="h-8 bg-white" />
      <Input name="reviewNote" placeholder="Review note (optional)" maxLength={500} className="h-8 bg-white" />
      <div className="flex gap-2">
        <Button size="sm" type="submit" name="decision" value="approve">Approve</Button>
        <Button size="sm" type="submit" name="decision" value="reject" variant="outline">Reject</Button>
      </div>
      {state.message ? (
        <p className={state.status === "error" ? "text-xs text-red-700" : "text-xs text-green-700"} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
