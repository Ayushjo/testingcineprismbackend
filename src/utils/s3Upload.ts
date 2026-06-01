import { Upload } from "@aws-sdk/lib-storage";
import { s3Client, BUCKET_NAME } from "../config/aws";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = "articles"
): Promise<{ url: string; key: string }> => {
  const fileExtension = path.extname(file.originalname).slice(1);
  const fileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

  // Use file stream from disk if available, otherwise fall back to buffer
  const body = file.path
    ? fs.createReadStream(file.path)
    : file.buffer;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
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
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const url = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION
    }.amazonaws.com/${fileName}`;
    return { url, key: fileName };
  } catch (error) {
    // Clean up temp file even on failure
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch {}
    }
    console.error("S3 Upload Error:", error);
    throw new Error("Failed to upload file to S3");
  }
};
