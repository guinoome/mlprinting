import "server-only";
import { prisma, isDatabaseConfigured } from "@/lib/db";
export async function findPublicMemoryContext(slug: string) {
  if (!isDatabaseConfigured()) return null;
  return prisma.invitation.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      profileId: true,
      title: true,
      eventTitle: true,
      slug: true,
      memorySettings: true,
    },
  });
}
export async function findOwnerMemoryContext(
  profileId: string,
  invitationId: string,
) {
  if (!isDatabaseConfigured()) return null;
  return prisma.invitation.findFirst({
    where: { id: invitationId, profileId },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      memorySettings: true,
    },
  });
}
export async function upsertMemorySettings(
  invitationId: string,
  data: {
    enabled: boolean;
    mode:
      | "PRIVATE_COLLECTION"
      | "GUEST_GALLERY"
      | "LIVE_WALL"
      | "POST_EVENT_ARCHIVE";
    opensAt: Date | null;
    closesAt: Date | null;
    allowVideos: boolean;
  },
) {
  return prisma.eventMemorySettings.upsert({
    where: { invitationId },
    update: data,
    create: { invitationId, ...data },
  });
}
export async function insertMemorySubmission(data: {
  id: string;
  invitationId: string;
  guestName: string | null;
  caption: string | null;
  bucket: string;
  storagePath: string;
  mimeType: string;
  bytes: number;
  originalFilename: string;
}) {
  return prisma.eventMemorySubmission.create({ data });
}

export async function listOwnerMemorySubmissions(
  profileId: string,
  invitationId: string,
) {
  if (!isDatabaseConfigured()) return [];
  return prisma.eventMemorySubmission.findMany({
    where: { invitationId, invitation: { profileId } },
    orderBy: { createdAt: "desc" },
  });
}
export async function moderateMemorySubmission(
  profileId: string,
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  if (!isDatabaseConfigured()) return false;
  const owned = await prisma.eventMemorySubmission.findFirst({
    where: { id, invitation: { profileId } },
    select: { id: true },
  });
  if (!owned) return false;
  await prisma.eventMemorySubmission.update({
    where: { id },
    data: { status, moderatedAt: new Date() },
  });
  return true;
}
export async function listPublicApprovedMemories(slug: string) {
  if (!isDatabaseConfigured()) return [];
  return prisma.eventMemorySubmission.findMany({
    where: {
      status: "APPROVED",
      invitation: {
        slug,
        isPublished: true,
        memorySettings: {
          enabled: true,
          mode: { in: ["GUEST_GALLERY", "LIVE_WALL"] },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export async function findMemoryForRead(id: string) {
  if (!isDatabaseConfigured()) return null;
  return prisma.eventMemorySubmission.findUnique({
    where: { id },
    include: {
      invitation: {
        select: { profileId: true, isPublished: true, memorySettings: true },
      },
    },
  });
}
