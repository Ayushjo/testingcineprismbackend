-- Add short-link codes for Post and Article.
-- Additive & non-destructive: nullable columns + unique indexes only.
-- Existing rows get NULL and are backfilled by scripts/backfillShortIds.ts.

ALTER TABLE "Post" ADD COLUMN "shortId" TEXT;
ALTER TABLE "Article" ADD COLUMN "shortId" TEXT;

CREATE UNIQUE INDEX "Post_shortId_key" ON "Post"("shortId");
CREATE UNIQUE INDEX "Article_shortId_key" ON "Article"("shortId");
