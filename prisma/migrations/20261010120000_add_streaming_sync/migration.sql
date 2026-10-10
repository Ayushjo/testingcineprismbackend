-- Streaming sync: link reviews to TMDB and record when "where to watch" was last refreshed.
-- Additive only: two nullable columns, no existing data is changed.
ALTER TABLE "public"."Post" ADD COLUMN "streamingSyncedAt" TIMESTAMP(3),
ADD COLUMN "tmdbId" INTEGER;
