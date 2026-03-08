"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromS3 = void 0;
// utils/s3Delete.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_1 = require("../config/aws");
const deleteFromS3 = async (key) => {
    const deleteParams = {
        Bucket: aws_1.BUCKET_NAME,
        Key: key,
    };
    try {
        await aws_1.s3Client.send(new client_s3_1.DeleteObjectCommand(deleteParams));
    }
    catch (error) {
        console.error("S3 Delete Error:", error);
        throw new Error("Failed to delete file from S3");
    }
};
exports.deleteFromS3 = deleteFromS3;
