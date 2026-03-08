-- CreateTable
CREATE TABLE "public"."IndieMovies" (
    "id" TEXT NOT NULL,
    "genres" TEXT[],
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "posterImageUrl" TEXT NOT NULL,
    "directedBy" TEXT NOT NULL,
    "streamingAt" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndieMovies_pkey" PRIMARY KEY ("id")
);
