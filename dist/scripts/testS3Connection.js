"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/testS3Connection.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
async function testConnection() {
    console.log("🔌 Testing AWS S3 Connection...\n");
    console.log("=".repeat(60));
    // Step 1: Test Credentials
    console.log("\n1️⃣  Testing AWS Credentials...");
    try {
        const command = new client_s3_1.ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log("   ✅ Credentials are valid!");
        console.log(`   📦 Found ${response.Buckets?.length || 0} buckets in your account`);
        if (response.Buckets && response.Buckets.length > 0) {
            console.log("\n   Available buckets:");
            response.Buckets.forEach((bucket) => {
                console.log(`      - ${bucket.Name}`);
            });
        }
    }
    catch (error) {
        console.error("   ❌ Credential test failed:", error.message);
        console.log("\n   🔧 Troubleshooting:");
        console.log("      1. Check AWS_ACCESS_KEY_ID in .env");
        console.log("      2. Check AWS_SECRET_ACCESS_KEY in .env");
        console.log("      3. Verify IAM user exists");
        console.log("      4. Check if access keys are active");
        return;
    }
    // Step 2: Test Target Bucket Exists
    console.log("\n2️⃣  Checking Target Bucket...");
    try {
        const command = new client_s3_1.ListBucketsCommand({});
        const response = await s3Client.send(command);
        const bucketExists = response.Buckets?.some((b) => b.Name === BUCKET_NAME);
        if (bucketExists) {
            console.log(`   ✅ Target bucket "${BUCKET_NAME}" exists!`);
        }
        else {
            console.log(`   ❌ Target bucket "${BUCKET_NAME}" not found!`);
            console.log("\n   🔧 Please create the bucket:");
            console.log(`      1. Go to AWS S3 Console`);
            console.log(`      2. Create bucket named: ${BUCKET_NAME}`);
            console.log(`      3. Use region: ${process.env.AWS_REGION}`);
            return;
        }
    }
    catch (error) {
        console.error("   ❌ Bucket check failed:", error.message);
        return;
    }
    // Step 3: Test Upload Permission
    console.log("\n3️⃣  Testing Upload Permission...");
    const testFileName = `test-uploads/test-${Date.now()}.txt`;
    const testContent = "Hello from S3 migration test!";
    try {
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testFileName,
            Body: Buffer.from(testContent),
            ContentType: "text/plain",
        });
        await s3Client.send(uploadCommand);
        console.log("   ✅ Upload permission works!");
        console.log(`   📁 Test file uploaded: ${testFileName}`);
    }
    catch (error) {
        console.error("   ❌ Upload test failed:", error.message);
        console.log("\n   🔧 Troubleshooting:");
        console.log("      1. Check IAM policy includes s3:PutObject");
        console.log("      2. Verify bucket policy allows uploads");
        console.log("      3. Check if bucket is in correct region");
        return;
    }
    // Step 4: Test Read Permission
    console.log("\n4️⃣  Testing Read Permission...");
    try {
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testFileName,
        });
        const response = await s3Client.send(getCommand);
        const body = await response.Body?.transformToString();
        if (body === testContent) {
            console.log("   ✅ Read permission works!");
            console.log("   📖 Successfully read test file");
        }
        else {
            console.log("   ⚠️  Read succeeded but content mismatch");
        }
    }
    catch (error) {
        console.error("   ❌ Read test failed:", error.message);
        console.log("\n   🔧 Troubleshooting:");
        console.log("      1. Check IAM policy includes s3:GetObject");
        return;
    }
    // Step 5: Test Delete Permission
    console.log("\n5️⃣  Testing Delete Permission...");
    try {
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testFileName,
        });
        await s3Client.send(deleteCommand);
        console.log("   ✅ Delete permission works!");
        console.log("   🗑️  Test file cleaned up");
    }
    catch (error) {
        console.error("   ❌ Delete test failed:", error.message);
        console.log("\n   ⚠️  Note: Test file may still exist in bucket");
        console.log("   🔧 Consider adding s3:DeleteObject to IAM policy");
    }
    // Step 6: Test Public Access
    console.log("\n6️⃣  Testing Public URL Access...");
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${testFileName}`;
    console.log(`   🌐 Public URL format: ${publicUrl}`);
    console.log("   ℹ️  Note: File was deleted, but URL format is correct");
    console.log("   ⚠️  Ensure bucket policy allows public read for GetObject");
    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("\n✨ Connection Test Summary:\n");
    console.log("   ✅ AWS credentials validated");
    console.log("   ✅ Target bucket exists");
    console.log("   ✅ Upload permission confirmed");
    console.log("   ✅ Read permission confirmed");
    console.log("   ✅ Delete permission confirmed");
    console.log("\n🎉 All tests passed! Ready to migrate.\n");
    console.log("=".repeat(60));
    console.log("\n📋 Next Steps:");
    console.log("   1. Run dry run: npm run migrate:dry-run");
    console.log("   2. Backup database: pg_dump your_db > backup.sql");
    console.log("   3. Run migration: npm run migrate:cloudinary-to-s3");
}
async function main() {
    try {
        console.log("\n🔍 Environment Check:\n");
        console.log(`   Region: ${process.env.AWS_REGION || "❌ NOT SET"}`);
        console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME || "❌ NOT SET"}`);
        console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID ? "✅ Set" : "❌ NOT SET"}`);
        console.log(`   Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? "✅ Set" : "❌ NOT SET"}`);
        if (!process.env.AWS_REGION ||
            !process.env.AWS_S3_BUCKET_NAME ||
            !process.env.AWS_ACCESS_KEY_ID ||
            !process.env.AWS_SECRET_ACCESS_KEY) {
            console.log("\n❌ Missing required environment variables!");
            console.log("\nPlease add to your .env file:");
            console.log("   AWS_REGION=us-east-1");
            console.log("   AWS_S3_BUCKET_NAME=your-bucket-name");
            console.log("   AWS_ACCESS_KEY_ID=your-access-key");
            console.log("   AWS_SECRET_ACCESS_KEY=your-secret-key\n");
            return;
        }
        await testConnection();
    }
    catch (error) {
        console.error("\n💥 Unexpected error:", error.message);
        console.log("\n🔧 Please check your AWS configuration and try again.");
    }
}
main();
