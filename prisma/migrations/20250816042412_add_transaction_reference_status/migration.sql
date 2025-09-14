-- AlterEnum
-- Add enum values one at a time (needed for Postgres 11 or earlier).
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'DEPOSIT';

-- AlterTable: Transactions
ALTER TABLE "Transaction" 
ADD COLUMN "metadata" JSONB,
ADD COLUMN "reference" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- Backfill existing rows (if any) with a generated reference
UPDATE "Transaction"
SET "reference" = gen_random_uuid()::text
WHERE "reference" IS NULL;

-- Now make the column required
ALTER TABLE "Transaction" 
ALTER COLUMN "reference" SET NOT NULL;

-- AlterTable: Wallet
ALTER TABLE "Wallet" 
ADD COLUMN "paystackRecipientCode" TEXT;
