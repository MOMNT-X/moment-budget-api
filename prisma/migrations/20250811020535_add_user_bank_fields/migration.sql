/*
  Warnings:

  - A unique constraint covering the columns `[paystackAccountNumber]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankCode" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "paystackSubaccount" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "paystackAccountNumber" TEXT,
ADD COLUMN     "paystackBankName" TEXT,
ADD COLUMN     "paystackCustomerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_paystackAccountNumber_key" ON "Wallet"("paystackAccountNumber");
