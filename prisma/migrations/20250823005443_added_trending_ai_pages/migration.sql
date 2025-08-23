-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('discussion', 'recommendation', 'analysis', 'matchup');

-- CreateEnum
CREATE TYPE "public"."ContentStatus" AS ENUM ('active', 'archived', 'draft');

-- CreateEnum
CREATE TYPE "public"."SectionType" AS ENUM ('movies', 'news', 'ai');

-- CreateEnum
CREATE TYPE "public"."RefreshStatus" AS ENUM ('success', 'failed', 'in_progress');

-- CreateTable
CREATE TABLE "public"."trending_movies" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "overview" TEXT,
    "release_date" DATE NOT NULL,
    "vote_average" DECIMAL(3,1) NOT NULL,
    "vote_count" INTEGER NOT NULL,
    "popularity_score" DECIMAL(10,2) NOT NULL,
    "trending_rank" INTEGER NOT NULL,
    "genre_ids" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trending_news" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "author" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "image_url" TEXT,
    "category" TEXT NOT NULL,
    "trending_score" INTEGER,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_trending_content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "public"."ContentType" NOT NULL,
    "prompt_used" TEXT,
    "status" "public"."ContentStatus" NOT NULL DEFAULT 'active',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "engagement_score" DECIMAL(5,2),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_trending_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_refresh_log" (
    "id" SERIAL NOT NULL,
    "section_type" "public"."SectionType" NOT NULL,
    "last_refresh_attempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_successful_refresh" TIMESTAMP(3),
    "status" "public"."RefreshStatus" NOT NULL,
    "error_message" TEXT,
    "records_updated" INTEGER,

    CONSTRAINT "content_refresh_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trending_movies_tmdb_id_idx" ON "public"."trending_movies"("tmdb_id");

-- CreateIndex
CREATE INDEX "trending_movies_trending_rank_idx" ON "public"."trending_movies"("trending_rank");

-- CreateIndex
CREATE INDEX "trending_movies_last_updated_idx" ON "public"."trending_movies"("last_updated");

-- CreateIndex
CREATE UNIQUE INDEX "trending_news_url_key" ON "public"."trending_news"("url");

-- CreateIndex
CREATE INDEX "trending_news_published_at_idx" ON "public"."trending_news"("published_at");

-- CreateIndex
CREATE INDEX "trending_news_last_updated_idx" ON "public"."trending_news"("last_updated");

-- CreateIndex
CREATE INDEX "trending_news_category_idx" ON "public"."trending_news"("category");

-- CreateIndex
CREATE INDEX "ai_trending_content_content_type_idx" ON "public"."ai_trending_content"("content_type");

-- CreateIndex
CREATE INDEX "ai_trending_content_status_idx" ON "public"."ai_trending_content"("status");

-- CreateIndex
CREATE INDEX "ai_trending_content_created_at_idx" ON "public"."ai_trending_content"("created_at");

-- CreateIndex
CREATE INDEX "ai_trending_content_expires_at_idx" ON "public"."ai_trending_content"("expires_at");

-- CreateIndex
CREATE INDEX "content_refresh_log_section_type_idx" ON "public"."content_refresh_log"("section_type");

-- CreateIndex
CREATE INDEX "content_refresh_log_last_successful_refresh_idx" ON "public"."content_refresh_log"("last_successful_refresh");

-- CreateIndex
CREATE INDEX "content_refresh_log_status_idx" ON "public"."content_refresh_log"("status");
