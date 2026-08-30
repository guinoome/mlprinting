CREATE TYPE "LifecycleNotificationKind" AS ENUM ('MEMORY_PROMPT', 'THANK_YOU', 'ARCHIVE_READY', 'REVIEW_REQUEST');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TABLE "lifecycle_notifications" ("id" UUID NOT NULL,"invitationId" UUID NOT NULL,"profileId" UUID NOT NULL,"kind" "LifecycleNotificationKind" NOT NULL,"channel" TEXT NOT NULL DEFAULT 'in_app',"scheduledAt" TIMESTAMP(3) NOT NULL,"status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',"payload" JSONB NOT NULL,"consentBasis" TEXT,"attempts" INTEGER NOT NULL DEFAULT 0,"lastError" TEXT,"claimedAt" TIMESTAMP(3),"sentAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "lifecycle_notifications_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "lifecycle_notifications_invitationId_kind_key" ON "lifecycle_notifications"("invitationId", "kind");
CREATE INDEX "lifecycle_notifications_status_scheduledAt_idx" ON "lifecycle_notifications"("status", "scheduledAt");
CREATE INDEX "lifecycle_notifications_profileId_scheduledAt_idx" ON "lifecycle_notifications"("profileId", "scheduledAt");
ALTER TABLE "lifecycle_notifications" ADD CONSTRAINT "lifecycle_notifications_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lifecycle_notifications" ADD CONSTRAINT "lifecycle_notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
