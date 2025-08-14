/*
  Warnings:

  - You are about to drop the column `posterImageId` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "posterImageId",
ADD COLUMN     "posterImageUrl" TEXT;
