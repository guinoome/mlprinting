CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "payment_proofs" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "submittedById" UUID NOT NULL,
  "status" "PaymentProofStatus" NOT NULL DEFAULT 'PENDING',
  "bucket" TEXT NOT NULL DEFAULT 'media',
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "customerNote" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_proofs_storagePath_key" ON "payment_proofs"("storagePath");
CREATE INDEX "payment_proofs_orderId_status_createdAt_idx" ON "payment_proofs"("orderId", "status", "createdAt");
CREATE INDEX "payment_proofs_submittedById_createdAt_idx" ON "payment_proofs"("submittedById", "createdAt");
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma owns database access. Keep financial evidence inaccessible through
-- the public Data API; authorized reads are proxied by the application.
ALTER TABLE "payment_proofs" ENABLE ROW LEVEL SECURITY;
