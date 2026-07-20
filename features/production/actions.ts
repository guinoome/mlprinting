"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import {
  moveItem,
  assignItem,
  addNote,
  type OrderItemStatusValue,
} from "@/services/orders";

/**
 * Production Server Actions — Ph7.md §4, §7, §8.
 *
 * requireStaff() is called in every one of these, not only on the page that
 * renders the controls. A Server Action is reachable by POST regardless of what
 * was rendered, so a check that lives only in the page is decoration.
 */

export interface ProductionActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialProductionState: ProductionActionState = {
  status: "idle",
  message: null,
};

const VALID_STATUSES: readonly OrderItemStatusValue[] = [
  "PENDING",
  "DRAFT_CREATION",
  "CUSTOMER_REVIEW",
  "REVISION",
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
  "COMPLETED",
  "CANCELLED",
];

function fail(message: string): ProductionActionState {
  return { status: "error", message };
}

export async function moveItemAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const itemId = String(formData.get("itemId") ?? "");
  const to = String(formData.get("to") ?? "");

  if (!itemId) return fail("Missing item.");
  if (!(VALID_STATUSES as readonly string[]).includes(to)) {
    return fail("That is not a valid status.");
  }

  const result = await moveItem(itemId, to as OrderItemStatusValue, profile.id);
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.production);
  return { status: "success", message: null };
}

export async function assignItemAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const itemId = String(formData.get("itemId") ?? "");
  const raw = String(formData.get("assigneeId") ?? "");
  if (!itemId) return fail("Missing item.");

  // An empty value means "unassign", which is a legitimate thing to do.
  const result = await assignItem(itemId, raw || null, profile.id);
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.production);
  return { status: "success", message: null };
}

export async function addNoteAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const orderId = String(formData.get("orderId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!orderId) return fail("Missing order.");
  if (!body) return fail("Write something first.");
  if (body.length > 2000) return fail("That note is too long.");

  const result = await addNote(orderId, profile.id, body);
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.bookings);
  return { status: "success", message: "Note saved." };
}
