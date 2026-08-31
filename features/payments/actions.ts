"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import { isPayMongoConfigured } from "@/lib/env";
import {
  expirePayMongoCheckout,
  getStaffOnlineSettlement,
  prepareOnlineSettlement,
  recordOfflineSettlement,
  resetExpiredOnlineSettlement,
} from "@/services/commerce";

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
  if (
    kind !== "paid" &&
    kind !== "waived" &&
    kind !== "online" &&
    kind !== "reset-online"
  ) {
    return { status: "error", message: "Invalid settlement type." };
  }
  if (kind === "reset-online") {
    if (!isPayMongoConfigured()) {
      return { status: "error", message: "PayMongo is not configured." };
    }
    const payment = await getStaffOnlineSettlement(orderId);
    if (
      !payment?.providerReference ||
      payment.provider !== "paymongo" ||
      payment.status !== "PENDING"
    ) {
      return { status: "error", message: "No active checkout was found." };
    }
    try {
      await expirePayMongoCheckout(payment.providerReference);
    } catch {
      return {
        status: "error",
        message: "PayMongo did not confirm that checkout was cancelled.",
      };
    }
    const reset = await resetExpiredOnlineSettlement({
      orderId,
      actorId: staff.id,
      providerReference: payment.providerReference,
    });
    if (!reset.ok) return { status: "error", message: reset.message };
    revalidatePath(routes.admin.bookings);
    return { status: "success", message: "Online checkout cancelled." };
  }
  if (kind === "waived" && reason.length < 5) {
    return { status: "error", message: "Give a brief waiver reason." };
  }
  if (kind !== "waived" && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return {
      status: "error",
      message: "Enter a valid amount with at most two decimals.",
    };
  }
  const amountMinor =
    kind === "waived" ? 0 : Math.round(Number(amount) * 100);
  if (
    !Number.isSafeInteger(amountMinor) ||
    (kind !== "waived" && amountMinor <= 0)
  ) {
    return { status: "error", message: "Enter a valid positive amount." };
  }
  if (kind === "online" && !isPayMongoConfigured()) {
    return {
      status: "error",
      message: "Add the PayMongo test key and webhook secret first.",
    };
  }
  const result =
    kind === "online"
      ? await prepareOnlineSettlement({
          orderId,
          actorId: staff.id,
          amountMinor,
          currency: "PHP",
        })
      : await recordOfflineSettlement({
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
    message:
      kind === "waived"
        ? "Waiver recorded."
        : kind === "online"
          ? "Online payment is ready for the customer."
          : "Payment recorded.",
  };
}
