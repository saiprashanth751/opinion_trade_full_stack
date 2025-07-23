/*
  Warnings:

  - You are about to drop the column `max_bet` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `min_bet` on the `Event` table. All the data in the column will be lost.
  - Added the required column `initialNoPrice` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialYesPrice` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "max_bet",
DROP COLUMN "min_bet",
ADD COLUMN     "initialNoPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "initialYesPrice" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "UserContract" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "yesContracts" INTEGER NOT NULL DEFAULT 0,
    "noContracts" INTEGER NOT NULL DEFAULT 0,
    "lockedYesContracts" INTEGER NOT NULL DEFAULT 0,
    "lockedNoContracts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserContract_userId_eventId_key" ON "UserContract"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "UserContract" ADD CONSTRAINT "UserContract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContract" ADD CONSTRAINT "UserContract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
