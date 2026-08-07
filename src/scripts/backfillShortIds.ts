import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import { generateUniqueShortCode } from "../utils/shortId";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

/**
 * One-off backfill: assign a unique shortId to every Post and Article that
 * doesn't already have one. Safe to re-run — it only touches rows where
 * shortId IS NULL.
 *
 *   npx ts-node src/scripts/backfillShortIds.ts
 */
async function main() {
  // ── Posts ────────────────────────────────────────────────────────────────
  const posts = await prisma.post.findMany({
    where: { shortId: null },
    select: { id: true, title: true },
  });
  console.log(`Posts needing a shortId: ${posts.length}`);

  for (const p of posts) {
    const code = await generateUniqueShortCode(
      async (c) => !!(await prisma.post.findUnique({ where: { shortId: c } }))
    );
    await prisma.post.update({ where: { id: p.id }, data: { shortId: code } });
    console.log(`  review  ${code}  ←  ${p.title}`);
  }

  // ── Articles ─────────────────────────────────────────────────────────────
  const articles = await prisma.article.findMany({
    where: { shortId: null },
    select: { id: true, title: true },
  });
  console.log(`Articles needing a shortId: ${articles.length}`);

  for (const a of articles) {
    const code = await generateUniqueShortCode(
      async (c) => !!(await prisma.article.findUnique({ where: { shortId: c } }))
    );
    await prisma.article.update({ where: { id: a.id }, data: { shortId: code } });
    console.log(`  article ${code}  ←  ${a.title}`);
  }

  console.log("\n✅ Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
