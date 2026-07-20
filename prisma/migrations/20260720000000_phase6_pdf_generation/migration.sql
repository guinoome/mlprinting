-- CreateEnum
CREATE TYPE "PdfPageSize" AS ENUM ('FIVE_BY_SEVEN', 'A5', 'A6');

-- CreateEnum
CREATE TYPE "PdfGenerationStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "pdf_generations" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "pageSize" "PdfPageSize" NOT NULL,
    "status" "PdfGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "storagePath" TEXT,
    "bytes" INTEGER,
    "generatorVersion" TEXT NOT NULL,
    "templateVersion" TEXT,
    "validationReport" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_generations_invitationId_createdAt_idx" ON "pdf_generations"("invitationId", "createdAt");

-- AddForeignKey
ALTER TABLE "pdf_generations" ADD CONSTRAINT "pdf_generations_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
