"use server";

import { z } from "zod";
import { createRsvp, invitationAcceptsRsvps } from "./repository";

/**
 * RSVP submission — Ph5.md §3. Intentionally unauthenticated: guests have no
 * ML-DEP account. Validates at the boundary — the same "gate, not a scanner"
 * posture as services/upload/validation.ts — before ever reaching the
 * database. No rate limiting or spam protection (design doc's stated,
 * deliberate gap, not an oversight).
 */

const rsvpSchema = z.object({
  guestName: z.string().trim().min(1, "Please enter your name.").max(120),
  attending: z.enum(["yes", "no"]),
  guestCount: z.coerce.number().int().min(1).max(10),
  message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export interface RsvpFormState {
  error?: string;
  success?: boolean;
}

export async function submitRsvp(
  _prev: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const invitationId = String(formData.get("invitationId") ?? "");

  const accepts = await invitationAcceptsRsvps(invitationId);
  if (!accepts) {
    return { error: "This invitation is not accepting responses." };
  }

  const parsed = rsvpSchema.safeParse({
    guestName: formData.get("guestName"),
    attending: formData.get("attending"),
    guestCount: formData.get("guestCount") ?? "1",
    message: formData.get("message") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your response.",
    };
  }

  const result = await createRsvp(invitationId, {
    guestName: parsed.data.guestName,
    attending: parsed.data.attending === "yes",
    guestCount: parsed.data.guestCount,
    message: parsed.data.message ?? null,
  });

  if (!result.ok) return { error: result.error };

  return { success: true };
}
