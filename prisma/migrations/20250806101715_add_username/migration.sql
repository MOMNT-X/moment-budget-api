/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `BudgetCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "frequency" "RecurrenceFrequency",
ADD COLUMN     "nextRunDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_name_key" ON "BudgetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
