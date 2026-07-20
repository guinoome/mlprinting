"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { approveItem, requestRevision } from "@/services/orders";

/**
 * Customer order actions — Ph7.md §6 (approval), §5 (revision).
 *
 * Authenticate, then delegate to ownership-scoped engine functions. The engine
 * proves the customer owns the item; this layer only proves they are signed in
 * and shapes the form. A signed-in customer acting on someone else's item is
 * stopped in the query, not here.
 */

export interface OrderActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialOrderActionState: OrderActionState = {
  status: "idle",
  message: null,
};

function fail(message: string): OrderActionState {
  return { status: "error", message };
}

export async function approveItemAction(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const profile = await getProfile();
  if (!profile) return fail("Please sign in and try again.");

  const itemId = String(formData.get("itemId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!itemId) return fail("Missing item.");

  const result = await approveItem(profile.id, itemId);
  if (!result.ok) return fail(result.message);

  if (orderId) revalidatePath(`${routes.dashboard.orders}/${orderId}`);
  return { status: "success", message: "Approved. We'll start production." };
}

export async function requestRevisionAction(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const profile = await getProfile();
  if (!profile) return fail("Please sign in and try again.");

  const itemId = String(formData.get("itemId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!itemId) return fail("Missing item.");
  if (!description) return fail("Please describe the change you'd like.");
  if (description.length > 2000) return fail("That request is too long.");

  const result = await requestRevision(profile.id, itemId, description);
  if (!result.ok) return fail(result.message);

  if (orderId) revalidatePath(`${routes.dashboard.orders}/${orderId}`);
  return { status: "success", message: "Sent. We'll make the changes." };
}
