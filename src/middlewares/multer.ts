import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Ensure temp upload directory exists
const TEMP_DIR = "/tmp/cineprism-uploads";
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 50,                   // max 50 files per request
  },
});

export default uploadFile;
