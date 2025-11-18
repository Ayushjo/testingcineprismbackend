// utils/s3Upload.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "../config/aws";
import crypto from "crypto";

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = "articles"
): Promise<{ url: string; key: string }> => {
  const fileExtension = file.originalname.split(".").pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // Make files publicly readable (optional)
    // ACL: "public-read" as ObjectCannedACL,
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct the public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return { url, key: fileName };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error("Failed to upload file to S3");
  }
};
