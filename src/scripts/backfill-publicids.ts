// scripts/backfill-publicids.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URL: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{publicId}.{ext}
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting publicId:", error);
    return null;
  }
}

async function backfillPublicIds() {
  console.log("Starting backfill of publicId fields...");

  // Get all articles
  const articles = await prisma.article.findMany({
    include: {
      blocks: true,
    },
  });

  console.log(`Found ${articles.length} articles to process`);

  for (const article of articles) {
    console.log(`\nProcessing article: ${article.title}`);

    // Extract main image publicId
    let mainImagePublicId = null;
    if (article.mainImageUrl) {
      mainImagePublicId = extractPublicIdFromUrl(article.mainImageUrl);
      console.log(`  Main image publicId: ${mainImagePublicId}`);
    }

    // Update article with main image publicId
    await prisma.article.update({
      where: { id: article.id },
      data: {
        mainImagePublicId,
      },
    });

    // Process blocks
    for (const block of article.blocks) {
      if (block.type === "IMAGE") {
        const content = block.content as any;

        // Check if URL exists in content
        if (content.url) {
          const publicId = extractPublicIdFromUrl(content.url);
          console.log(`  Block ${block.id} publicId: ${publicId}`);

          // Update block with publicId
          await prisma.contentBlock.update({
            where: { id: block.id },
            data: {
              publicId,
              // Also update content to include publicId if not present
              content: {
                ...content,
                publicId: publicId || content.publicId,
              },
            },
          });
        }
      }
    }

    console.log(`✓ Completed article: ${article.title}`);
  }

  console.log("\n✅ Backfill completed successfully!");
}

backfillPublicIds()
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
