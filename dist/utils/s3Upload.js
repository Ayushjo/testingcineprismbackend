"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = void 0;
const lib_storage_1 = require("@aws-sdk/lib-storage");
const aws_1 = require("../config/aws");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadToS3 = async (file, folder = "articles") => {
    const fileExtension = path_1.default.extname(file.originalname).slice(1);
    const fileName = `${folder}/${crypto_1.default.randomUUID()}.${fileExtension}`;
    // Use file stream from disk if available, otherwise fall back to buffer
    const body = file.path
        ? fs_1.default.createReadStream(file.path)
        : file.buffer;
    const upload = new lib_storage_1.Upload({
        client: aws_1.s3Client,
        params: {
            Bucket: aws_1.BUCKET_NAME,
            Key: fileName,
            Body: body,
            ContentType: file.mimetype,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
    });
    try {
        await upload.done();
        // Delete temp file from disk after successful S3 upload
        if (file.path && fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
        const url = `https://${aws_1.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        return { url, key: fileName };
    }
    catch (error) {
        // Clean up temp file even on failure
        if (file.path && fs_1.default.existsSync(file.path)) {
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch { }
        }
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload file to S3");
    }
};
exports.uploadToS3 = uploadToS3;
