-- CreateTable
CREATE TABLE "public"."byGenres" (
    "id" TEXT NOT NULL,
    "genre" TEXT[],
    "directedBy" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "posterImageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "byGenres_pkey" PRIMARY KEY ("id")
);
