-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "rsvp_responses" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "guestName" TEXT NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rsvp_responses_invitationId_createdAt_idx" ON "rsvp_responses"("invitationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");

-- AddForeignKey
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
