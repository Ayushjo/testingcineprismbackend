"use strict";
// scripts/migrateToS3.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const client_s3_1 = require("@aws-sdk/client-s3");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
// Helper: Download image from URL
async function downloadImage(url) {
    const response = await axios_1.default.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data);
}
// Helper: Upload to S3
async function uploadToS3(buffer, fileName, contentType = "image/jpeg") {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
    });
    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}
// Helper: Extract filename from Cloudinary URL
function getFileNameFromUrl(url) {
    const urlParts = url.split("/");
    const fileWithExt = urlParts[urlParts.length - 1];
    return fileWithExt;
}
// Helper: Determine content type
function getContentType(url) {
    const ext = url.split(".").pop()?.toLowerCase();
    const types = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
    };
    return types[ext || "jpg"] || "image/jpeg";
}
// ============================================
// MIGRATION FUNCTIONS
// ============================================
// 1. Migrate Articles
async function migrateArticles() {
    console.log("🔄 Starting Article migration...");
    const articles = await prisma.article.findMany({
        include: { blocks: true },
    });
    let successCount = 0;
    let errorCount = 0;
    for (const article of articles) {
        try {
            // Migrate main image
            if (article.mainImageUrl) {
                const imageBuffer = await downloadImage(article.mainImageUrl);
                const fileName = `articles/main-images/${article.id}-${getFileNameFromUrl(article.mainImageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(article.mainImageUrl));
                await prisma.article.update({
                    where: { id: article.id },
                    data: { mainImageUrl: newUrl },
                });
                console.log(`✅ Migrated main image for article: ${article.title}`);
            }
            // Migrate content block images
            for (const block of article.blocks) {
                if (block.type === "IMAGE" && block.content) {
                    const content = block.content;
                    if (content.url) {
                        const imageBuffer = await downloadImage(content.url);
                        const fileName = `articles/content-blocks/${article.id}-${block.id}-${getFileNameFromUrl(content.url)}`;
                        const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(content.url));
                        await prisma.contentBlock.update({
                            where: { id: block.id },
                            data: {
                                content: {
                                    ...content,
                                    url: newUrl,
                                    key: fileName,
                                },
                            },
                        });
                        console.log(`✅ Migrated block image for article: ${article.title}`);
                    }
                }
            }
            successCount++;
        }
        catch (error) {
            console.error(`❌ Error migrating article ${article.title}:`, error.message);
            errorCount++;
        }
    }
    console.log(`\n📊 Articles: ${successCount} success, ${errorCount} errors\n`);
}
// 2. Migrate Posts
async function migratePosts() {
    console.log("🔄 Starting Post migration...");
    const posts = await prisma.post.findMany({
        include: { images: true },
    });
    let successCount = 0;
    let errorCount = 0;
    for (const post of posts) {
        try {
            // Migrate poster image
            if (post.posterImageUrl) {
                const imageBuffer = await downloadImage(post.posterImageUrl);
                const fileName = `posts/posters/${post.id}-${getFileNameFromUrl(post.posterImageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(post.posterImageUrl));
                await prisma.post.update({
                    where: { id: post.id },
                    data: { posterImageUrl: newUrl },
                });
            }
            // Migrate review poster
            if (post.reviewPosterImageUrl) {
                const imageBuffer = await downloadImage(post.reviewPosterImageUrl);
                const fileName = `posts/review-posters/${post.id}-${getFileNameFromUrl(post.reviewPosterImageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(post.reviewPosterImageUrl));
                await prisma.post.update({
                    where: { id: post.id },
                    data: { reviewPosterImageUrl: newUrl },
                });
            }
            // Migrate post images
            for (const image of post.images) {
                const imageBuffer = await downloadImage(image.imageUrl);
                const fileName = `posts/images/${post.id}-${image.id}-${getFileNameFromUrl(image.imageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(image.imageUrl));
                await prisma.postImage.update({
                    where: { id: image.id },
                    data: { imageUrl: newUrl },
                });
            }
            console.log(`✅ Migrated post: ${post.title}`);
            successCount++;
        }
        catch (error) {
            console.error(`❌ Error migrating post ${post.title}:`, error.message);
            errorCount++;
        }
    }
    console.log(`\n📊 Posts: ${successCount} success, ${errorCount} errors\n`);
}
// 3. Migrate byGenres
async function migrateByGenres() {
    console.log("🔄 Starting byGenres migration...");
    const genres = await prisma.byGenres.findMany();
    let successCount = 0;
    let errorCount = 0;
    for (const genre of genres) {
        try {
            if (genre.posterImageUrl) {
                const imageBuffer = await downloadImage(genre.posterImageUrl);
                const fileName = `by-genres/${genre.id}-${getFileNameFromUrl(genre.posterImageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(genre.posterImageUrl));
                await prisma.byGenres.update({
                    where: { id: genre.id },
                    data: { posterImageUrl: newUrl },
                });
                console.log(`✅ Migrated byGenres: ${genre.title}`);
                successCount++;
            }
        }
        catch (error) {
            console.error(`❌ Error migrating byGenres ${genre.title}:`, error.message);
            errorCount++;
        }
    }
    console.log(`\n📊 byGenres: ${successCount} success, ${errorCount} errors\n`);
}
// 4. Migrate TopPicks
async function migrateTopPicks() {
    console.log("🔄 Starting TopPicks migration...");
    const picks = await prisma.topPicks.findMany();
    let successCount = 0;
    let errorCount = 0;
    for (const pick of picks) {
        try {
            if (pick.posterImageUrl) {
                const imageBuffer = await downloadImage(pick.posterImageUrl);
                const fileName = `top-picks/${pick.id}-${getFileNameFromUrl(pick.posterImageUrl)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(pick.posterImageUrl));
                await prisma.topPicks.update({
                    where: { id: pick.id },
                    data: { posterImageUrl: newUrl },
                });
                console.log(`✅ Migrated TopPicks: ${pick.title}`);
                successCount++;
            }
        }
        catch (error) {
            console.error(`❌ Error migrating TopPicks ${pick.title}:`, error.message);
            errorCount++;
        }
    }
    console.log(`\n📊 TopPicks: ${successCount} success, ${errorCount} errors\n`);
}
// 5. Migrate User Profile Pictures
async function migrateUsers() {
    console.log("🔄 Starting User migration...");
    const users = await prisma.user.findMany({
        where: {
            profilePicture: { not: null },
        },
    });
    let successCount = 0;
    let errorCount = 0;
    for (const user of users) {
        try {
            if (user.profilePicture && user.profilePicture.includes("cloudinary")) {
                const imageBuffer = await downloadImage(user.profilePicture);
                const fileName = `users/${user.id}-${getFileNameFromUrl(user.profilePicture)}`;
                const newUrl = await uploadToS3(imageBuffer, fileName, getContentType(user.profilePicture));
                await prisma.user.update({
                    where: { id: user.id },
                    data: { profilePicture: newUrl },
                });
                console.log(`✅ Migrated user: ${user.username}`);
                successCount++;
            }
        }
        catch (error) {
            console.error(`❌ Error migrating user ${user.username}:`, error.message);
            errorCount++;
        }
    }
    console.log(`\n📊 Users: ${successCount} success, ${errorCount} errors\n`);
}
// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
    console.log("🚀 Starting Cloudinary to S3 Migration\n");
    console.log(`📦 Target Bucket: ${BUCKET_NAME}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION}\n`);
    try {
        // Run migrations sequentially
        await migrateArticles();
        await migratePosts();
        await migrateByGenres();
        await migrateTopPicks();
        await migrateUsers();
        console.log("✨ Migration completed successfully!");
    }
    catch (error) {
        console.error("💥 Migration failed:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the migration
main();
