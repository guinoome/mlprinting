"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { features, routes } from "@/lib/config";
import { generatePrintFile } from "./generate";
import type { PdfSizeSlug, ValidationReport } from "@/services/pdf";

/**
 * Print Server Actions — Ph6.md §1.
 *
 * Mirrors features/website-generator/actions.ts: authenticate, check the flag,
 * parse, delegate, revalidate. The action renders nothing itself.
 */

export interface PrintActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  report: ValidationReport | null;
  generationId: string | null;
}

export const initialPrintState: PrintActionState = {
  status: "idle",
  message: null,
  report: null,
  generationId: null,
};

const SIZES: readonly PdfSizeSlug[] = ["FIVE_BY_SEVEN", "A5", "A6"];

function fail(
  message: string,
  report: ValidationReport | null = null,
): PrintActionState {
  return { status: "error", message, report, generationId: null };
}

export async function generatePrintFileAction(
  _previous: PrintActionState,
  formData: FormData,
): Promise<PrintActionState> {
  if (!features.pdfGeneration) {
    return fail("Print file generation is not available on this deployment.");
  }

  const profile = await getProfile();
  if (!profile) return fail("Please sign in and try again.");

  const invitationId = String(formData.get("invitationId") ?? "");
  const rawSize = String(formData.get("pageSize") ?? "");
  const cropMarks = formData.get("cropMarks") === "on";

  if (!invitationId) return fail("Missing invitation.");
  if (!(SIZES as readonly string[]).includes(rawSize)) {
    return fail("Choose a valid card size.");
  }

  const outcome = await generatePrintFile({
    profileId: profile.id,
    invitationId,
    pageSize: rawSize as PdfSizeSlug,
    cropMarks,
  });

  if (!outcome.ok) return fail(outcome.message, outcome.report);

  revalidatePath(routes.dashboard.eventPrint(invitationId));

  return {
    status: "success",
    message: `Version ${outcome.version} is ready to download.`,
    report: outcome.report,
    generationId: outcome.generationId,
  };
}
