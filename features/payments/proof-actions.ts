"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import {
  reviewPaymentProof,
  submitPaymentProof,
} from "@/services/commerce";

export interface PaymentProofActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialPaymentProofActionState: PaymentProofActionState = {
  status: "idle",
  message: null,
};

export async function submitPaymentProofAction(
  _previous: PaymentProofActionState,
  formData: FormData,
): Promise<PaymentProofActionState> {
  const profile = await getProfile();
  if (!profile) return { status: "error", message: "Please sign in again." };
  const orderId = String(formData.get("orderId") ?? "");
  const receipt = formData.get("receipt");
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !(receipt instanceof File) || receipt.size === 0) {
    return { status: "error", message: "Choose a receipt to upload." };
  }
  const result = await submitPaymentProof({
    profileId: profile.id,
    orderId,
    file: receipt,
    customerNote: note || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(routes.dashboard.order(orderId));
  revalidatePath(routes.admin.bookings);
  return { status: "success", message: "Receipt sent securely for review." };
}

export async function reviewPaymentProofAction(
  _previous: PaymentProofActionState,
  formData: FormData,
): Promise<PaymentProofActionState> {
  const staff = await requireStaff();
  const proofId = String(formData.get("proofId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("reviewNote") ?? "").trim();
  if (!proofId || (decision !== "approve" && decision !== "reject")) {
    return { status: "error", message: "Invalid review request." };
  }
  let amountMinor: number | null = null;
  if (decision === "approve") {
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return { status: "error", message: "Enter the verified PHP amount." };
    }
    amountMinor = Math.round(Number(amount) * 100);
  }
  const result = await reviewPaymentProof({
    proofId,
    actorId: staff.id,
    decision,
    amountMinor,
    reviewNote: note || null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(routes.admin.bookings);
  return {
    status: "success",
    message: decision === "approve" ? "Payment verified." : "Proof rejected.",
  };
}
