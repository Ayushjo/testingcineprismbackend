/*
  Warnings:

  - You are about to drop the column `postId` on the `TopPicks` table. All the data in the column will be lost.
  - Added the required column `posterImageUrl` to the `TopPicks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `TopPicks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `TopPicks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."TopPicks" DROP CONSTRAINT "TopPicks_postId_fkey";

-- AlterTable
ALTER TABLE "public"."TopPicks" DROP COLUMN "postId",
ADD COLUMN     "posterImageUrl" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;
