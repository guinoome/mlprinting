import "server-only";

import { randomUUID } from "node:crypto";
import type { PaymentProofStatus } from "@prisma/client";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { BUCKETS, removeFile, uploadFile } from "@/services/upload/storage";
import {
  extensionOf,
  uploadKindForMime,
  validateUpload,
} from "@/services/upload";
import { canTransitionPayment } from "./state";
import type { PaymentStatusValue } from "./types";

export const PAYMENT_PROOF_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.pdf";
export const PAYMENT_PROOF_MAX_BYTES = 4 * 1024 * 1024;

export function paymentProofKind(file: {
  name: string;
  size: number;
  type: string;
}) {
  if (file.size > PAYMENT_PROOF_MAX_BYTES) return null;
  const kind = uploadKindForMime(file.type);
  if (kind !== "image" && kind !== "document") return null;
  return validateUpload(file, kind) ? null : kind;
}

export function paymentProofPath(input: {
  profileId: string;
  orderId: string;
  proofId: string;
  filename: string;
}) {
  return `${input.profileId}/payment-proofs/${input.orderId}/${input.proofId}${extensionOf(input.filename)}`;
}

export async function submitPaymentProof(input: {
  profileId: string;
  orderId: string;
  file: File;
  customerNote: string | null;
}) {
  if (!isDatabaseConfigured())
    return { ok: false as const, message: "Payments are unavailable." };
  const kind = paymentProofKind(input.file);
  if (!kind) {
    return {
      ok: false as const,
      message: "Upload a JPG, PNG, WebP, HEIC, or PDF receipt up to 4 MB.",
    };
  }

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, profileId: input.profileId },
    select: {
      id: true,
      payment: { select: { status: true } },
      paymentProofs: {
        where: { status: "PENDING" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!order) return { ok: false as const, message: "Order not found." };
  if (order.payment?.status === "CAPTURED" || order.payment?.status === "WAIVED") {
    return { ok: false as const, message: "This order is already settled." };
  }
  if (order.paymentProofs.length > 0) {
    return {
      ok: false as const,
      message: "A receipt is already waiting for review.",
    };
  }

  const proofId = randomUUID();
  const path = paymentProofPath({
    profileId: input.profileId,
    orderId: input.orderId,
    proofId,
    filename: input.file.name,
  });
  const stored = await uploadFile({
    bucket: BUCKETS.media,
    path,
    file: input.file,
    kind,
  });
  if (!("path" in stored)) return { ok: false as const, message: stored.message };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentProof.create({
        data: {
          id: proofId,
          orderId: input.orderId,
          submittedById: input.profileId,
          bucket: BUCKETS.media,
          storagePath: path,
          mimeType: stored.contentType,
          bytes: stored.bytes,
          originalFilename: input.file.name.slice(0, 255),
          customerNote: input.customerNote?.slice(0, 500) || null,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          actorId: input.profileId,
          type: "PAYMENT_STATUS",
          message: "Customer submitted payment proof for staff verification.",
        },
      });
    });
    return { ok: true as const };
  } catch (error) {
    await removeFile(BUCKETS.media, path);
    logger.report(error, { at: "submitPaymentProof", orderId: input.orderId });
    return { ok: false as const, message: "Could not save the receipt." };
  }
}

export async function reviewPaymentProof(input: {
  proofId: string;
  actorId: string;
  decision: "approve" | "reject";
  amountMinor: number | null;
  reviewNote: string | null;
}) {
  if (!isDatabaseConfigured())
    return { ok: false as const, message: "Payments are unavailable." };
  try {
    return await prisma.$transaction(async (tx) => {
      const proof = await tx.paymentProof.findUnique({
        where: { id: input.proofId },
        include: { order: { select: { id: true, payment: true } } },
      });
      if (!proof || proof.status !== "PENDING") {
        return { ok: false as const, message: "This proof is no longer pending." };
      }

      const reviewNote = input.reviewNote?.slice(0, 500) || null;
      if (input.decision === "reject") {
        const claimed = await tx.paymentProof.updateMany({
          where: { id: proof.id, status: "PENDING" },
          data: {
            status: "REJECTED",
            reviewedById: input.actorId,
            reviewedAt: new Date(),
            reviewNote,
          },
        });
        if (claimed.count !== 1) {
          return { ok: false as const, message: "This proof is no longer pending." };
        }
        await tx.orderEvent.create({
          data: {
            orderId: proof.orderId,
            actorId: input.actorId,
            type: "PAYMENT_STATUS",
            message: reviewNote
              ? `Payment proof rejected: ${reviewNote}`
              : "Payment proof rejected by staff.",
          },
        });
        return { ok: true as const };
      }

      if (!input.amountMinor || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
        return { ok: false as const, message: "Enter the verified amount." };
      }
      const current = proof.order.payment;
      if (
        current?.provider === "paymongo" &&
        current.providerReference &&
        current.status === "PENDING"
      ) {
        return {
          ok: false as const,
          message: "Cancel the active PayMongo checkout before approving manual proof.",
        };
      }
      const from = (current?.status ?? "PENDING") as PaymentStatusValue;
      if (current && !canTransitionPayment(from, "CAPTURED")) {
        return { ok: false as const, message: "This payment cannot be approved." };
      }

      const verifiedAt = new Date();
      const claimed = await tx.paymentProof.updateMany({
        where: { id: proof.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedById: input.actorId,
          reviewedAt: verifiedAt,
          reviewNote,
        },
      });
      if (claimed.count !== 1) {
        return { ok: false as const, message: "This proof is no longer pending." };
      }
      await tx.payment.upsert({
        where: { orderId: proof.orderId },
        update: {
          status: "CAPTURED",
          amountMinor: input.amountMinor,
          currency: "PHP",
          provider: "manual-proof",
          providerReference: proof.id,
          verifiedAt,
        },
        create: {
          orderId: proof.orderId,
          status: "CAPTURED",
          amountMinor: input.amountMinor,
          currency: "PHP",
          provider: "manual-proof",
          providerReference: proof.id,
          verifiedAt,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: proof.orderId,
          actorId: input.actorId,
          type: "PAYMENT_STATUS",
          fromStatus: current?.status ?? null,
          toStatus: "CAPTURED",
          message: `Manual payment proof verified: PHP ${(input.amountMinor / 100).toFixed(2)}.`,
        },
      });
      return { ok: true as const };
    });
  } catch (error) {
    logger.report(error, { at: "reviewPaymentProof", proofId: input.proofId });
    return { ok: false as const, message: "Could not review payment proof." };
  }
}

export async function getPaymentProofForViewer(input: {
  proofId: string;
  viewerId: string;
  staff: boolean;
}) {
  if (!isDatabaseConfigured()) return null;
  return prisma.paymentProof.findFirst({
    where: {
      id: input.proofId,
      ...(input.staff
        ? {}
        : { order: { profileId: input.viewerId } }),
    },
    select: {
      id: true,
      bucket: true,
      storagePath: true,
      mimeType: true,
      originalFilename: true,
    },
  });
}

export type PaymentProofStatusValue = PaymentProofStatus;
