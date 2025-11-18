// scripts/dryRunMigration.ts
// This script will show what will be migrated WITHOUT making any changes

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

interface MigrationStats {
  model: string;
  totalRecords: number;
  recordsWithImages: number;
  totalImages: number;
  estimatedSize?: string;
}

async function analyzeArticles(): Promise<MigrationStats> {
  const articles = await prisma.article.findMany({
    include: { blocks: true },
  });

  let totalImages = 0;
  let recordsWithImages = 0;

  for (const article of articles) {
    let hasImages = false;

    if (article.mainImageUrl) {
      totalImages++;
      hasImages = true;
    }

    for (const block of article.blocks) {
      if (block.type === "IMAGE" && block.content) {
        const content = block.content as any;
        if (content.url) {
          totalImages++;
          hasImages = true;
        }
      }
    }

    if (hasImages) recordsWithImages++;
  }

  return {
    model: "Article",
    totalRecords: articles.length,
    recordsWithImages,
    totalImages,
  };
}

async function analyzePosts(): Promise<MigrationStats> {
  const posts = await prisma.post.findMany({
    include: { images: true },
  });

  let totalImages = 0;
  let recordsWithImages = 0;

  for (const post of posts) {
    let hasImages = false;

    if (post.posterImageUrl) {
      totalImages++;
      hasImages = true;
    }

    if (post.reviewPosterImageUrl) {
      totalImages++;
      hasImages = true;
    }

    totalImages += post.images.length;
    if (post.images.length > 0) hasImages = true;

    if (hasImages) recordsWithImages++;
  }

  return {
    model: "Post",
    totalRecords: posts.length,
    recordsWithImages,
    totalImages,
  };
}

async function analyzeByGenres(): Promise<MigrationStats> {
  const genres = await prisma.byGenres.findMany();

  const recordsWithImages = genres.filter((g) => g.posterImageUrl).length;

  return {
    model: "byGenres",
    totalRecords: genres.length,
    recordsWithImages,
    totalImages: recordsWithImages,
  };
}

async function analyzeTopPicks(): Promise<MigrationStats> {
  const picks = await prisma.topPicks.findMany();

  const recordsWithImages = picks.filter((p) => p.posterImageUrl).length;

  return {
    model: "TopPicks",
    totalRecords: picks.length,
    recordsWithImages,
    totalImages: recordsWithImages,
  };
}

async function analyzeUsers(): Promise<MigrationStats> {
  const users = await prisma.user.findMany();

  const recordsWithImages = users.filter(
    (u) => u.profilePicture && u.profilePicture.includes("cloudinary")
  ).length;

  return {
    model: "User",
    totalRecords: users.length,
    recordsWithImages,
    totalImages: recordsWithImages,
  };
}

async function main() {
  console.log("🔍 DRY RUN: Analyzing migration requirements\n");
  console.log("=".repeat(60));

  try {
    const stats = await Promise.all([
      analyzeArticles(),
      analyzePosts(),
      analyzeByGenres(),
      analyzeTopPicks(),
      analyzeUsers(),
    ]);

    console.log("\n📊 Migration Summary:\n");

    let totalImages = 0;
    stats.forEach((stat) => {
      console.log(`${stat.model}:`);
      console.log(`  Total Records: ${stat.totalRecords}`);
      console.log(`  Records with Images: ${stat.recordsWithImages}`);
      console.log(`  Total Images: ${stat.totalImages}`);
      console.log("");

      totalImages += stat.totalImages;
    });

    console.log("=".repeat(60));
    console.log(`\n🎯 TOTAL IMAGES TO MIGRATE: ${totalImages}\n`);
    console.log("=".repeat(60));

    // Show sample URLs
    console.log("\n📸 Sample Image URLs:\n");

    const sampleArticle = await prisma.article.findFirst({
      where: { mainImageUrl: { not: undefined } },
    });
    if (sampleArticle) {
      console.log(`Article Image: ${sampleArticle.mainImageUrl}`);
    }

    const samplePost = await prisma.post.findFirst({
      where: { posterImageUrl: { not: undefined } },
    });
    if (samplePost) {
      console.log(`Post Image: ${samplePost.posterImageUrl}`);
    }

    console.log("\n✅ Dry run completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Review the numbers above");
    console.log("   2. Ensure AWS credentials are correct");
    console.log("   3. Run: npm run migrate:cloudinary-to-s3");
  } catch (error) {
    console.error("❌ Error during dry run:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
