/*
  Warnings:

  - The `adminId` column on the `Post` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "adminId",
ADD COLUMN     "adminId" INTEGER NOT NULL DEFAULT 1;
