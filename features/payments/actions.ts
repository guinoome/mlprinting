"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import { recordOfflineSettlement } from "@/services/commerce";

export interface SettlementState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialSettlementState: SettlementState = {
  status: "idle",
  message: null,
};

export async function recordSettlementAction(
  _previous: SettlementState,
  formData: FormData,
): Promise<SettlementState> {
  const staff = await requireStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId) return { status: "error", message: "Missing order." };
  if (kind !== "paid" && kind !== "waived") {
    return { status: "error", message: "Invalid settlement type." };
  }
  if (kind === "waived" && reason.length < 5) {
    return { status: "error", message: "Give a brief waiver reason." };
  }
  if (kind === "paid" && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return {
      status: "error",
      message: "Enter a valid amount with at most two decimals.",
    };
  }
  const amountMinor = kind === "paid" ? Math.round(Number(amount) * 100) : 0;
  if (
    !Number.isSafeInteger(amountMinor) ||
    (kind === "paid" && amountMinor <= 0)
  ) {
    return { status: "error", message: "Enter a valid positive amount." };
  }
  const result = await recordOfflineSettlement({
    orderId,
    actorId: staff.id,
    amountMinor,
    currency: "PHP",
    waiveReason: kind === "waived" ? reason.slice(0, 500) : null,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(routes.admin.bookings);
  return {
    status: "success",
    message: kind === "waived" ? "Waiver recorded." : "Payment recorded.",
  };
}
