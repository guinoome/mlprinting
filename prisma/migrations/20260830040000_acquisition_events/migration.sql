CREATE TYPE "AcquisitionEventType" AS ENUM ('HOMEPAGE_CTA');
CREATE TABLE "acquisition_events" (
  "id" UUID NOT NULL,
  "type" "AcquisitionEventType" NOT NULL,
  "source" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "acquisition_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "acquisition_events_type_createdAt_idx" ON "acquisition_events"("type", "createdAt");
