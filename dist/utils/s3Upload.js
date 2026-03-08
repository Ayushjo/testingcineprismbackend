"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = void 0;
// utils/s3Upload.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_1 = require("../config/aws");
const crypto_1 = __importDefault(require("crypto"));
const uploadToS3 = async (file, folder = "articles") => {
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${folder}/${crypto_1.default.randomUUID()}.${fileExtension}`;
    const uploadParams = {
        Bucket: aws_1.BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Make files publicly readable (optional)
        // ACL: "public-read" as ObjectCannedACL,
    };
    try {
        await aws_1.s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
        // Construct the public URL
        const url = `https://${aws_1.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        return { url, key: fileName };
    }
    catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload file to S3");
    }
};
exports.uploadToS3 = uploadToS3;
