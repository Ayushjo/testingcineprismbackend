-- CreateEnum
CREATE TYPE "public"."RatingCategory" AS ENUM ('HIGHLY_RECOMMENDED', 'RECOMMENDED', 'LEAST_RECOMMENDED');

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "posterImageId" TEXT,
ADD COLUMN     "ratingCategory" "public"."RatingCategory" NOT NULL DEFAULT 'RECOMMENDED',
ADD COLUMN     "relatedPostIds" TEXT[];
