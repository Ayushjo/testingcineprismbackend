// scripts/uploadImage.js
// Simple Node.js script to upload image to S3

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Load .env from project root
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Verify environment variables
if (
  !process.env.AWS_REGION ||
  !process.env.AWS_S3_BUCKET_NAME ||
  !process.env.AWS_ACCESS_KEY_ID
) {
  console.error("❌ Missing AWS environment variables!");
  console.error("\nRequired in .env:");
  console.error("  AWS_REGION=ap-south-1");
  console.error("  AWS_S3_BUCKET_NAME=thecineprismimages");
  console.error("  AWS_ACCESS_KEY_ID=your_key");
  console.error("  AWS_SECRET_ACCESS_KEY=your_secret");
  console.error("\nCurrent values:");
  console.error(`  AWS_REGION: ${process.env.AWS_REGION || "❌ NOT SET"}`);
  console.error(
    `  AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME || "❌ NOT SET"}`
  );
  console.error(
    `  AWS_ACCESS_KEY_ID: ${
      process.env.AWS_ACCESS_KEY_ID ? "✅ Set" : "❌ NOT SET"
    }`
  );
  console.error(
    `  AWS_SECRET_ACCESS_KEY: ${
      process.env.AWS_SECRET_ACCESS_KEY ? "✅ Set" : "❌ NOT SET"
    }`
  );
  process.exit(1);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return types[ext] || "image/jpeg";
}

async function uploadImage(localFilePath, s3Folder = "manual-uploads") {
  try {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${localFilePath}`);
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileName = path.basename(localFilePath);
    const s3Key = `${s3Folder}/${fileName}`;
    const contentType = getContentType(localFilePath);

    console.log(`📤 Uploading: ${fileName}`);
    console.log(`📁 To folder: ${s3Folder}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`\n✅ Upload successful!\n`);
    console.log(`🔗 Image URL:`);
    console.log(`   ${url}\n`);
    console.log(`🔑 S3 Key:`);
    console.log(`   ${s3Key}\n`);

    return { url, key: s3Key };
  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    throw error;
  }
}

// Get arguments
const filePath = process.argv[2];
const folder = process.argv[3] || "manual-uploads";

if (!filePath) {
  console.log("❌ Please provide a file path");
  console.log("\nUsage:");
  console.log("  node scripts/uploadImage.js <file-path> [folder]");
  console.log("\nExamples:");
  console.log("  node scripts/uploadImage.js ./my-image.jpg");
  console.log("  node scripts/uploadImage.js ./poster.png posts/posters");
  console.log(
    "  node scripts/uploadImage.js ~/Downloads/photo.jpg articles/main-images"
  );
  process.exit(1);
}

console.log("🚀 Starting S3 Upload\n");

uploadImage(filePath, folder)
  .then(({ url, key }) => {
    console.log("✨ Done! Copy the URL above to use in your app.\n");
  })
  .catch(() => process.exit(1));
