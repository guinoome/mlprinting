-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "artworkId" UUID,
ADD COLUMN     "generatedCoverUrl" TEXT;
-- CreateTable
CREATE TABLE "template_assets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailPath" TEXT,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_assets_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "template_assets_storagePath_key" ON "template_assets"("storagePath");
-- CreateIndex
CREATE INDEX "template_assets_createdAt_idx" ON "template_assets"("createdAt");
-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "template_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "template_assets" ADD CONSTRAINT "template_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
