/*
  Warnings:

  - You are about to drop the column `duration` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCategory` on the `Post` table. All the data in the column will be lost.
  - Added the required column `directedBy` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamingAt` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "duration",
DROP COLUMN "origin",
DROP COLUMN "ratingCategory",
ADD COLUMN     "directedBy" TEXT NOT NULL,
ADD COLUMN     "streamingAt" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."RatingCategory";
