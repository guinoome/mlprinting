CREATE TYPE "EventMemoryMode" AS ENUM ('PRIVATE_COLLECTION', 'GUEST_GALLERY', 'LIVE_WALL', 'POST_EVENT_ARCHIVE');
CREATE TYPE "EventMemoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TABLE "event_memory_settings" ("invitationId" UUID NOT NULL,"enabled" BOOLEAN NOT NULL DEFAULT false,"mode" "EventMemoryMode" NOT NULL DEFAULT 'PRIVATE_COLLECTION',"opensAt" TIMESTAMP(3),"closesAt" TIMESTAMP(3),"allowVideos" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "event_memory_settings_pkey" PRIMARY KEY ("invitationId"));
CREATE TABLE "event_memory_submissions" ("id" UUID NOT NULL,"invitationId" UUID NOT NULL,"status" "EventMemoryStatus" NOT NULL DEFAULT 'PENDING',"guestName" TEXT,"caption" TEXT,"bucket" TEXT NOT NULL,"storagePath" TEXT NOT NULL,"mimeType" TEXT NOT NULL,"bytes" INTEGER NOT NULL,"originalFilename" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"moderatedAt" TIMESTAMP(3),CONSTRAINT "event_memory_submissions_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "event_memory_submissions_storagePath_key" ON "event_memory_submissions"("storagePath");
CREATE INDEX "event_memory_submissions_invitationId_status_createdAt_idx" ON "event_memory_submissions"("invitationId", "status", "createdAt");
ALTER TABLE "event_memory_settings" ADD CONSTRAINT "event_memory_settings_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_memory_submissions" ADD CONSTRAINT "event_memory_submissions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-side Prisma owns data access; deny direct PostgREST access by default.
ALTER TABLE "event_memory_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_memory_submissions" ENABLE ROW LEVEL SECURITY;
