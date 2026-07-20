import "server-only";

import type { Prisma, PdfGeneration, PdfPageSize } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import { uploadFile, signedUrl, BUCKETS } from "@/services/upload/storage";
import { pdfObjectPath } from "./paths";

/**
 * PDF-generation persistence — Ph6.md §11, §12.
 *
 * Mirrors features/website-generator/repository.ts's shape: every read and
 * write proves ownership in the WHERE clause, through the invitation, rather
 * than trusting the caller to have checked. Returns null on a miss and never
 * distinguishes "not yours" from "does not exist".
 */

export type GenerationRow = PdfGeneration;

const PRINT_INCLUDE = {
  template: {
    select: { id: true, name: true, version: true, printCompatible: true },
  },
  hosts: { orderBy: { sortOrder: "asc" } },
  venues: { orderBy: { sortOrder: "asc" } },
  content: true,
  people: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
  program: { orderBy: { sortOrder: "asc" } },
  personalization: true,
  media: {
    orderBy: { sortOrder: "asc" },
    include: { asset: { select: { id: true } } },
  },
} satisfies Prisma.InvitationInclude;

export type PrintInvitation = Prisma.InvitationGetPayload<{
  include: typeof PRINT_INCLUDE;
}>;

/**
 * One invitation with everything print needs, for its owner only.
 *
 * Assets are selected by id alone: the renderer fetches each placed asset in
 * full through services/media, which is the module that owns them. Copying
 * asset columns here would put a second owner of that shape in the system.
 */
export async function findInvitationForPrint(
  profileId: string,
  invitationId: string,
): Promise<PrintInvitation | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      include: PRINT_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "findInvitationForPrint", invitationId });
    return null;
  }
}

/**
 * The next human-facing version number for this invitation.
 *
 * Derived from the highest existing version rather than a count, so deleting a
 * row could never hand out the same number twice.
 */
export async function nextVersionFor(invitationId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 1;

  try {
    const latest = await prisma.pdfGeneration.findFirst({
      where: { invitationId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  } catch (error) {
    logger.report(error, { at: "nextVersionFor", invitationId });
    return 1;
  }
}

export interface CreateGenerationInput {
  invitationId: string;
  version: number;
  pageSize: PdfPageSize;
  generatorVersion: string;
  templateVersion: string | null;
}

/** Records the attempt before any bytes exist, so a crash mid-render leaves a trace. */
export async function createGeneration(
  input: CreateGenerationInput,
): Promise<GenerationRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.pdfGeneration.create({
      data: { ...input, status: "PENDING" },
    });
  } catch (error) {
    logger.report(error, {
      at: "createGeneration",
      invitationId: input.invitationId,
    });
    return null;
  }
}

export async function markGenerationReady(
  id: string,
  storagePath: string,
  bytes: number,
  validationReport: unknown,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.pdfGeneration.update({
      where: { id },
      data: {
        status: "READY",
        storagePath,
        bytes,
        validationReport: validationReport as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.report(error, { at: "markGenerationReady", id });
  }
}

export async function markGenerationFailed(
  id: string,
  message: string,
  validationReport: unknown,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await prisma.pdfGeneration.update({
      where: { id },
      data: {
        status: "FAILED",
        error: message,
        validationReport: validationReport as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    logger.report(error, { at: "markGenerationFailed", id });
  }
}

/** Newest first — Ph6.md §12's version history. Owner-scoped through the invitation. */
export async function listGenerations(
  profileId: string,
  invitationId: string,
): Promise<GenerationRow[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.pdfGeneration.findMany({
      where: { invitationId, invitation: { profileId } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listGenerations", invitationId });
    return [];
  }
}

/**
 * One generation, for its owner. This is the download route's entire
 * authorization check: the ownership test is the query, not a separate `if`
 * a later edit could drop.
 */
export async function getGenerationForOwner(
  profileId: string,
  generationId: string,
): Promise<GenerationRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.pdfGeneration.findFirst({
      where: { id: generationId, invitation: { profileId } },
    });
  } catch (error) {
    logger.report(error, { at: "getGenerationForOwner", generationId });
    return null;
  }
}

/** Writes the document to the private media bucket. Returns the path, or null. */
export async function storePdf(
  profileId: string,
  invitationId: string,
  generationId: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const path = pdfObjectPath(profileId, invitationId, generationId);
  const file = new File([bytes as BlobPart], `${generationId}.pdf`, {
    type: "application/pdf",
  });

  const result = await uploadFile({
    bucket: BUCKETS.media,
    path,
    file,
    kind: "document",
  });

  if ("code" in result) {
    logger.report(new Error(result.message), { at: "storePdf", path });
    return null;
  }
  return result.path;
}

/**
 * Reads a stored document back for re-serving. Short-lived signed URL: it is
 * used once, server-side, and never reaches the browser — only our own
 * re-served bytes do, exactly as the media proxy route does it.
 */
export async function readPdf(
  storagePath: string,
): Promise<ReadableStream | null> {
  const url = await signedUrl(BUCKETS.media, storagePath, 60);
  if (!url) return null;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return null;
  return upstream.body;
}
