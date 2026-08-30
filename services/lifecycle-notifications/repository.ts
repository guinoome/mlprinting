import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { PlannedNotification } from "./types";

const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

export async function loadLifecycleContext(invitationId: string) {
  if (!isDatabaseConfigured()) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      profileId: true,
      eventDate: true,
      profile: {
        select: {
          preferences: {
            select: { emailNotifications: true, marketingEmails: true },
          },
        },
      },
      memorySettings: true,
    },
  });
  if (!invitation) return null;
  return {
    ...invitation,
    emailNotifications:
      invitation.profile.preferences?.emailNotifications ?? true,
    marketingEmails: invitation.profile.preferences?.marketingEmails ?? true,
  };
}

export async function savePlans(
  profileId: string,
  invitationId: string,
  plans: PlannedNotification[],
) {
  const active = plans.map((plan) => plan.kind);
  await prisma.$transaction([
    prisma.lifecycleNotification.updateMany({
      where: {
        invitationId,
        status: { in: ["PENDING", "PROCESSING", "FAILED"] },
        ...(active.length ? { kind: { notIn: active } } : {}),
      },
      data: { status: "CANCELLED", claimedAt: null },
    }),
    ...plans.map((plan) =>
      prisma.lifecycleNotification.upsert({
        where: { invitationId_kind: { invitationId, kind: plan.kind } },
        update: {
          scheduledAt: plan.scheduledAt,
          payload: plan.payload,
          consentBasis: plan.consentBasis,
          status: "PENDING",
          claimedAt: null,
          lastError: null,
        },
        create: {
          invitationId,
          profileId,
          kind: plan.kind,
          scheduledAt: plan.scheduledAt,
          payload: plan.payload,
          consentBasis: plan.consentBasis,
        },
      }),
    ),
  ]);
}

export async function claimDue(now: Date) {
  if (!isDatabaseConfigured()) return [];
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const claimable = {
    OR: [
      { status: "PENDING" as const, scheduledAt: { lte: now } },
      { status: "PROCESSING" as const, claimedAt: { lte: staleBefore } },
    ],
  };
  const candidates = await prisma.lifecycleNotification.findMany({
    where: claimable,
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  const claimed = [];
  for (const candidate of candidates) {
    const result = await prisma.lifecycleNotification.updateMany({
      where: { id: candidate.id, ...claimable },
      data: { status: "PROCESSING", claimedAt: now },
    });
    if (result.count === 1) claimed.push(candidate);
  }
  return claimed;
}

export async function recordDelivery(
  id: string,
  result: { ok: true } | { ok: false; error: string },
) {
  await prisma.lifecycleNotification.update({
    where: { id },
    data: result.ok
      ? {
          status: "SENT",
          sentAt: new Date(),
          claimedAt: null,
          attempts: { increment: 1 },
          lastError: null,
        }
      : {
          status: "FAILED",
          claimedAt: null,
          attempts: { increment: 1 },
          lastError: result.error.slice(0, 500),
        },
  });
}

export async function listForProfile(profileId: string) {
  if (!isDatabaseConfigured()) return [];
  return prisma.lifecycleNotification.findMany({
    where: { profileId, status: { in: ["PENDING", "PROCESSING", "SENT"] } },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });
}
