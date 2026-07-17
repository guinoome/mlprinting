-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VenueKind" AS ENUM ('CEREMONY', 'RECEPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PartyGroup" AS ENUM ('PARENT', 'SPONSOR', 'ENTOURAGE');

-- CreateEnum
CREATE TYPE "MediaSlot" AS ENUM ('COVER', 'COUPLE', 'FAMILY', 'LOGO', 'MUSIC');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'DOCUMENT', 'AUDIO');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "templateId" UUID,
    "title" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" TEXT NOT NULL DEFAULT 'template',
    "eventType" TEXT,
    "eventTitle" TEXT,
    "subtitle" TEXT,
    "eventDate" TIMESTAMP(3),
    "eventTime" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "rsvpDeadline" TIMESTAMP(3),
    "dressCode" TEXT,
    "eventTheme" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "lastSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_hosts" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoAssetId" UUID,
    "biography" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitation_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_venues" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "kind" "VenueKind" NOT NULL DEFAULT 'CEREMONY',
    "name" TEXT NOT NULL,
    "address" TEXT,
    "mapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parkingNotes" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "startTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitation_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_content" (
    "invitationId" UUID NOT NULL,
    "welcomeMessage" TEXT,
    "invitationMessage" TEXT,
    "giftsPreference" TEXT,
    "specialNotes" TEXT,
    "closingMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_content_pkey" PRIMARY KEY ("invitationId")
);

-- CreateTable
CREATE TABLE "invitation_people" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "group" "PartyGroup" NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitation_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_program_items" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitation_program_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_personalization" (
    "invitationId" UUID NOT NULL,
    "colorTheme" TEXT NOT NULL DEFAULT 'classic-ivory',
    "typography" TEXT NOT NULL DEFAULT 'classic-serif',
    "backgroundStyle" TEXT NOT NULL DEFAULT 'plain',
    "decorativeStyle" TEXT NOT NULL DEFAULT 'none',
    "hiddenSections" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_personalization_pkey" PRIMARY KEY ("invitationId")
);

-- CreateTable
CREATE TABLE "invitation_media" (
    "invitationId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "slot" "MediaSlot" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invitation_media_pkey" PRIMARY KEY ("invitationId","assetId","slot")
);

-- CreateIndex
CREATE INDEX "media_assets_profileId_createdAt_idx" ON "media_assets"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "invitations_profileId_status_updatedAt_idx" ON "invitations"("profileId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "invitations_templateId_idx" ON "invitations"("templateId");

-- CreateIndex
CREATE INDEX "invitation_hosts_invitationId_sortOrder_idx" ON "invitation_hosts"("invitationId", "sortOrder");

-- CreateIndex
CREATE INDEX "invitation_venues_invitationId_sortOrder_idx" ON "invitation_venues"("invitationId", "sortOrder");

-- CreateIndex
CREATE INDEX "invitation_people_invitationId_group_sortOrder_idx" ON "invitation_people"("invitationId", "group", "sortOrder");

-- CreateIndex
CREATE INDEX "invitation_program_items_invitationId_sortOrder_idx" ON "invitation_program_items"("invitationId", "sortOrder");

-- CreateIndex
CREATE INDEX "invitation_media_invitationId_slot_sortOrder_idx" ON "invitation_media"("invitationId", "slot", "sortOrder");

-- CreateIndex
CREATE INDEX "invitation_media_assetId_idx" ON "invitation_media"("assetId");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_hosts" ADD CONSTRAINT "invitation_hosts_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_venues" ADD CONSTRAINT "invitation_venues_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_content" ADD CONSTRAINT "invitation_content_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_people" ADD CONSTRAINT "invitation_people_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_program_items" ADD CONSTRAINT "invitation_program_items_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_personalization" ADD CONSTRAINT "invitation_personalization_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_media" ADD CONSTRAINT "invitation_media_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_media" ADD CONSTRAINT "invitation_media_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

