-- AlterEnum
ALTER TYPE "MediaKind" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
