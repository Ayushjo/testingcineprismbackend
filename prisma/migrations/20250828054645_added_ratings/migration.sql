/*
  Warnings:

  - Added the required column `ratingCategories` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "ratingCategories" JSONB NOT NULL;
