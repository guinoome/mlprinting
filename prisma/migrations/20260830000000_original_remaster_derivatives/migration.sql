-- The original MediaAsset remains the source of truth. Remasters are optional,
-- version-bound derivatives, selected per invitation usage and reversible.
CREATE TYPE "MediaDerivativeKind" AS ENUM ('REMASTER');

CREATE TABLE "media_derivatives" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "kind" "MediaDerivativeKind" NOT NULL DEFAULT 'REMASTER',
    "sourceVersion" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_derivatives_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invitation_media" ADD COLUMN "derivativeId" UUID;

CREATE UNIQUE INDEX "media_derivatives_storagePath_key" ON "media_derivatives"("storagePath");
CREATE UNIQUE INDEX "media_derivatives_assetId_sourceVersion_kind_provider_providerVersion_key" ON "media_derivatives"("assetId", "sourceVersion", "kind", "provider", "providerVersion");
CREATE INDEX "media_derivatives_assetId_sourceVersion_kind_createdAt_idx" ON "media_derivatives"("assetId", "sourceVersion", "kind", "createdAt");
CREATE INDEX "invitation_media_derivativeId_idx" ON "invitation_media"("derivativeId");

ALTER TABLE "media_derivatives" ADD CONSTRAINT "media_derivatives_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation_media" ADD CONSTRAINT "invitation_media_derivativeId_fkey" FOREIGN KEY ("derivativeId") REFERENCES "media_derivatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Server-side Prisma owns data access; deny direct PostgREST access by default.
ALTER TABLE "media_derivatives" ENABLE ROW LEVEL SECURITY;
