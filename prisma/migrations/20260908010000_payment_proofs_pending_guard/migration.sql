-- Prevent concurrent submissions from leaving more than one receipt awaiting
-- review for the same order. Historical approved/rejected proofs remain valid.
CREATE UNIQUE INDEX "payment_proofs_one_pending_per_order_key"
ON "payment_proofs" ("orderId")
WHERE "status" = 'PENDING';
