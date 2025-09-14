/*
  Warnings:

  - You are about to drop the column `accountNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bankCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `paystackSubaccount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subaccountCode` on the `Wallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reference]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Made the column `reference` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "reference" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountNumber",
DROP COLUMN "bankCode",
DROP COLUMN "bankName",
DROP COLUMN "paystackSubaccount";

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "subaccountCode",
ADD COLUMN     "paystackBusinessName" TEXT,
ADD COLUMN     "paystackSubaccountCode" TEXT NOT NULL DEFAULT 'TEMP_CODE';

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");
